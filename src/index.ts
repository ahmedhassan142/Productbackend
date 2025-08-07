import dotenv from "dotenv";
import mongoose from "mongoose";
import express, { Request, Response,NextFunction } from "express";
import cors from "cors";
import productRoute from "./routes/productroute";
import categoryRoute from "./routes/categoryroute";
import Product from "./models/product";

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || "";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
  // async function migrateProducts() {
//  const MONGODB_URI = process.env.MONGODB_URI || "";
//     mongoose.connect(MONGODB_URI)
//   .then(() => console.log("Connected to MongoDB"))
//   .catch(err => {
//     console.error("MongoDB connection error:", err);
//     process.exit(1);
//   });

  // Update all existing products to have the new fields with default values
//   const result = await Product.updateMany(
//     {}, 
//     {
//       $set: {
//         views: 0,
//         purchases: 0,
//         cartAdditions: 0
//         // lastViewed will remain undefined/null unless set
//       }
//     }
//   );

//   console.log(`Updated ${result.modifiedCount} products`);
//   await mongoose.disconnect();
// }

// migrateProducts().catch(console.error);

// Health check endpoint

// Routes
app.use("/api/products", productRoute);
app.use("/api/Category", categoryRoute);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3002;
const server = app.listen(PORT, () => {
  console.log(`Product service running on port ${PORT}`);
});

// Handle shutdown
process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  mongoose.connection.close(false).then(() => {
    console.log("MongoDB connection closed");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
})