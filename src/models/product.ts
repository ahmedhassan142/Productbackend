import mongoose from 'mongoose';

export interface IProduct {
  name: string;
  slug: string;
  description?: string;
  price: number;
  category: mongoose.Schema.Types.ObjectId; 
  sizes: string[];
  colors: string[];
  fit: string;
  material: string;
  imageUrl: string;
  views: number;              // New field
  purchases: number;          // New field
  cartAdditions: number;      // New field
  lastViewed?: Date;          // New field
}

const productSchema = new mongoose.Schema<IProduct>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  sizes: {
    type: [String],
    required: true
  },
  colors: {
    type: [String],
    required: true
  },
  fit: { 
    type: String, 
    required: true 
  },
  material: { 
    type: String, 
    required: true 
  },
  imageUrl: {
    type: String,
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  purchases: {
    type: Number,
    default: 0
  },
  cartAdditions: {
    type: Number,
    default: 0
  },
  lastViewed: {
    type: Date
  }
}, {
  timestamps: true
});

// Create compound text index (run this once manually if needed)
productSchema.index(
  { 
    name: 'text', 
    description: 'text',
    material: 'text',
    fit: 'text'
  },
  {
    weights: {
      name: 5,        // Higher weight for name
      description: 1,
      material: 2,
      fit: 2
    },
    name: 'product_text_search'
  }
);

const Product = mongoose.model<IProduct>('Product', productSchema);

export default Product;