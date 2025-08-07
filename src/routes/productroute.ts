// src/routes/productRoutes.ts
import { Request, Response } from 'express';
import Product from '../models/product';
import { v2 as cloudinary } from 'cloudinary';
import fileUpload from 'express-fileupload';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CategoryModel from '../models/category';
import { HybridRecommendationService } from '../service/hybridservice';

dotenv.config();
const router = require('express').Router();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Enhanced file upload middleware
router.use(fileUpload({
  useTempFiles: false, // Work with memory buffers
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1 // Only 1 file
  },
  abortOnLimit: true,
  responseOnLimit: 'File size exceeds 10MB limit'
}));

// Cloudinary upload result type
interface CloudinaryResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}

router.post('/add', async (req: Request, res: Response) => {
  try {
    // 1. Validate required fields from FormData
    const requiredFields = [
      'name', 'slug', 'price', 'category', 
      'sizes', 'colors', 'fit', 'material'
    ];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields,
        receivedData: req.body
      });
    }

    // 2. Find the category by slug (provided from frontend)
    const category = await CategoryModel.findOne({ slug: req.body.category });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category with slug '${req.body.category}' not found`,
        availableCategories: await CategoryModel.find().select('slug name -_id')
      });
    }

    // 3. Handle file upload
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required'
      });
    }

    const imageFile = Array.isArray(req.files.image) 
      ? req.files.image[0] 
      : req.files.image;

    // 4. Validate file properties
    if (!imageFile.data || imageFile.size === 0) {
      return res.status(400).json({
        success: false,
        message: 'Uploaded file is empty'
      });
    }

    if (!imageFile.mimetype?.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed'
      });
    }

    // 5. Upload to Cloudinary
    const uploadResult = await new Promise<CloudinaryResult>((resolve, reject) => {
      if (!imageFile.data) {
        reject(new Error('File buffer is empty'));
        return;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'products',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [{ width: 1200, quality: 'auto' }]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result) {
            reject(new Error('Cloudinary upload returned no result'));
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(imageFile.data);
    });

    // 6. Create product with proper category reference
    const productData = {
      name: req.body.name,
      slug: req.body.slug,
      description: req.body.description || '',
      price: parseFloat(req.body.price),
      category: category._id, // Using the found category's ObjectId
      sizes: JSON.parse(req.body.sizes),
      colors: JSON.parse(req.body.colors),
      fit: req.body.fit,
      material: req.body.material,
      imageUrl: uploadResult.secure_url,
      filters: req.body.filters ? JSON.parse(req.body.filters) : {}
    };

    // 7. Save to database
    const product = await Product.create(productData);

    // 8. Populate category info in the response
    const createdProduct = await Product.findById(product._id)
      .populate('category', 'name slug -_id')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: createdProduct
    });

  } catch (error: any) {
    console.error('Product creation error:', {
      message: error.message,
      stack: error.stack,
      http_code: error.http_code,
      name: error.name,
      body: req.body,
      files: req.files ? Object.keys(req.files) : null
    });

    const statusCode = error.http_code && error.http_code >= 400 && error.http_code < 600 
      ? error.http_code 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal server error',
      errorType: error.name
     
    });
  }
});




// GET ALL PRODUCTS
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;

    const query: any = {};
    
    if (category) query.category = category;
    if (search) query.$text = { $search: search as string };

    const products = await Product.find(query);

    return res.json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

// Other routes (GET by ID, UPDATE, DELETE) remain the same as previous simplified version

// Update your product route to use slug instead of ID
router.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
});

// UPDATE PRODUCT
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.json({
      success: true,
      data: updatedProduct
    });

  } catch (error: any) {
    console.error('Error updating product:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update product'
    });
  }
});

// DELETE PRODUCT
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
});
// src/routes/categoryRoutes.ts


// Get products by category slug (fixed version)
// Update your products route to match frontend expectation
router.get('/categories/:slug/products', async (req: Request, res: Response) => {
  try {
    const category = await CategoryModel.findOne({ slug: req.params.slug });
    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: 'Category not found' 
      });
    }

    const products = await Product.find({ category: category._id })
      .populate('category', 'name slug')
      .lean();

    return res.status(200).json({
      success: true,
      data: products // Ensure this matches frontend expectation
    });

  } catch (error: any) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch products'
    });
  }
});
// Add these new routes to your existing productRoutes.ts

// Advanced product search endpoint
// Add these to your existing product routes

// Search endpoint


router.get('/find/:id', async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
});
interface UpdateRatingsRequest {
  productId: string;
  rating: number;
  weight?: number; // Optional weight for verified purchases (default 1.0)
}

router.post('/update-ratings', async (req:Request,res:Response)=>{
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { productId, rating, weight = 1.0 }: UpdateRatingsRequest = req.body;

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
        errorCode: 'INVALID_PRODUCT_ID'
      });
    }

    if (rating < 1 || rating > 5) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
        errorCode: 'INVALID_RATING'
      });
    }

    // Find the product
    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        errorCode: 'PRODUCT_NOT_FOUND'
      });
    }

    // Initialize ratings if they don't exist
    if (!product.ratings) {
      product.ratings = {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        weightedAverage: 0,
        verifiedPurchases: { average: 0, count: 0 }
      };
    }

    // Update rating statistics
    const oldCount = product.ratings.count;
    const oldAverage = product.ratings.average;
    const newCount = oldCount + 1;
    
    // Update distribution
    product.ratings.distribution[rating as keyof typeof product.ratings.distribution] += 1;
    
    // Calculate new average
    product.ratings.average = (oldAverage * oldCount + rating) / newCount;
    product.ratings.count = newCount;
    
    // Update weighted average if weight is provided
    if (weight !== 1.0) {
      const oldWeightedCount = product.ratings.verifiedPurchases.count;
      const oldWeightedAverage = product.ratings.verifiedPurchases.average;
      const newWeightedCount = oldWeightedCount + 1;
      
      product.ratings.verifiedPurchases.average = 
        (oldWeightedAverage * oldWeightedCount + rating) / newWeightedCount;
      product.ratings.verifiedPurchases.count = newWeightedCount;
      
      // Calculate overall weighted average (mix of verified and unverified)
      const verifiedWeight = 1.2; // Verified purchases get 20% more weight
      const unverifiedCount = newCount - newWeightedCount;
      product.ratings.weightedAverage = 
        (product.ratings.verifiedPurchases.average * newWeightedCount * verifiedWeight + 
         (product.ratings.average * unverifiedCount)) / 
        (newWeightedCount * verifiedWeight + unverifiedCount);
    }

    await product.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Product ratings updated successfully',
      data: {
        averageRating: product.ratings.average,
        ratingCount: product.ratings.count,
        weightedAverage: product.ratings.weightedAverage
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating product ratings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product ratings',
      errorCode: 'RATING_UPDATE_FAILED'
    });
  }
});
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ 
        success: false,
        error: 'Search query must be at least 2 characters long' 
      });
    }

    const searchQuery = q.toString().trim();
    const searchRegex = new RegExp(searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');

    // Search in products and categories simultaneously
    const [products, categories] = await Promise.all([
      Product.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { tags: searchRegex }
        ]
      })
      .limit(10)
      .select('name slug price imageUrl')
      .populate('category', 'name slug imageUrl'),

      CategoryModel.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ]
      })
      .limit(5)
      .select('name slug')
    ]);

    res.json({
      success: true,
      data: {
        products,
        categories,
        meta: {
          productCount: products.length,
          categoryCount: categories.length
        }
      }
    });

  } catch (error: any) {
    console.error('Search error:', {
      query: req.query.q,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Suggestions endpoint (similar to your working example)
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.json({ 
        success: true,
        data: { products: [], categories: [] } 
      });
    }

    const searchTerm = q.toString().trim();
    const searchRegex = new RegExp(searchTerm, 'i');

    const [products, categories] = await Promise.all([
      Product.find({ name: searchRegex })
        .limit(5)
        .select('name slug'),
      CategoryModel.find({ name: searchRegex })
        .limit(3)
        .select('name slug')
    ]);

    res.json({
      success: true,
      data: { products, categories }
    });

  } catch (error: any) {
    console.error('Suggestion error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error'
    });
  }
});



// interface TrendingProduct {
//   _id: string;
//   name: string;
//   price: number;
//   imageUrl: string;
//   category?: {
//     name: string;
//   };
//   score?: number;
// }

router.get('/trending', async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    // Improved with:
    // 1. Weighted scoring system
    // 2. Time decay for recent activity
    // 3. Minimum thresholds
    const trendingProducts = await Product.aggregate([
      {
        $addFields: {
          // Weighted score calculation (adjust weights as needed)
          trendingScore: {
            $add: [
              { $multiply: ["$purchases", 5] },    // Purchases most important (5x)
              { $multiply: ["$cartAdditions", 3] }, // Cart additions medium (3x)
               "$views"                           // Views least important (1x)
            ]
          },
          // Recent activity boost (last 7 days)                                                                                               
          recentActivity: {
            $cond: [
              { $gt: ["$lastViewed", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
              10, // Bonus points for recent activity
              0
            ]
          }
        }
      },
      {
        $addFields: {
          finalScore: { $add: ["$trendingScore", "$recentActivity"] }
        }
      },
      { $sort: { finalScore: -1 } },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },
      {
        $project: {
          name: 1,
          slug: 1,
          price: 1,
          imageUrl: 1,
          views: 1,
          purchases: 1,
          cartAdditions: 1,
          "category.name": 1,
          finalScore: 1
        }
      }
    ]);

    res.status(200).json(trendingProducts);
  } catch (error) {
    console.error('Error fetching trending products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get( '/:productId/view',async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        $inc: { views: 1 },
        $set: { lastViewed: new Date() }
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error('Error incrementing product views:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.patch('/:productId/cart-addition',async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { increment = 1 } = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        $inc: { cartAdditions: increment }
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error('Error incrementing product cart additions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// product.routes.ts
router.post('/update-purchases', async (req: Request, res: Response) => {
  try {
    const { productIds, increment = 1 } = req.body;

    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ message: 'Invalid product IDs' });
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $inc: { purchases: increment } }
    );

    res.status(200).json({
      success: true,
      matched: result.matchedCount,
      modified: result.modifiedCount
    });
  } catch (error) {
    console.error('Error updating product purchases:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
const hybridService = new HybridRecommendationService();

// For product page recommendations (shows similar + popular)
router.get('/recommendations/:productId', async (req:Request, res:Response) => {
  const recommendations = await hybridService.getHybridRecommendations(
    req.params.productId
  );
  res.json(recommendations);
});

// For homepage recommendations (mostly popular with some diversity)
router.get('/recommendations', async (req:Request, res:Response) => {
  const recommendations = await hybridService.getHybridRecommendations();
  res.json(recommendations);
});

// product.controller.ts

export default router;