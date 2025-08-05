import { Request, Response } from "express";
import  CategoryModel  from "../models/category";

const router = require("express").Router();

// Helper function to build category tree
const buildCategoryTree = async (parentId: string | null = null) => {
  const categories = await CategoryModel.find({ parent: parentId });

  return Promise.all(
    categories.map(async (category:any) => {
      const children = await buildCategoryTree(category._id.toString());
      return {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        parentslug: category.parentslug,
        filters: category.filters,
        subcategories: children,
      };
    })
  );
};

// Get all categories (tree structure)
router.get("/", async (req: Request, res: Response) => {
  try {
    const categories = await buildCategoryTree();
    return res.status(200).json({ data: categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// Get category by slug
router.get("/slug/:slug", async (req: Request, res: Response) => {
  try {
    const category = await CategoryModel.findOne({ slug: req.params.slug });
    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: "Category not found" 
      });
    }
    return res.status(200).json({ 
      success: true,
      data: category 
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to fetch category" 
    });
  }
});
// Create new category
router.post("/add", async (req: Request, res: Response) => {
  const { name, slug, parentslug, filters } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ message: "Name and slug are required" });
  }

  try {
    // Check if category with this slug already exists
    const existingCategory = await CategoryModel.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ message: "Category with this slug already exists" });
    }

    let parent = null;
    if (parentslug && parentslug !== "none") {
      parent = await CategoryModel.findOne({ slug: parentslug });
      if (!parent) {
        return res.status(404).json({ message: "Parent category not found" });
      }
    }

    const newCategory = new CategoryModel({
      name,
      slug,
      parent: parent?._id || null,
      parentslug: parent?.slug || null,
      filters: filters || [],
    });

    await newCategory.save();
    return res.status(201).json({ 
      message: "Category created successfully",
      data: newCategory
    });
  } catch (error: any) {
    console.error("Error creating category:", error);
    return res.status(500).json({ 
      message: error.message || "Failed to create category" 
    });
  }
});
export default router;