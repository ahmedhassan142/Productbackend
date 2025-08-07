"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const productroute_1 = __importDefault(require("./routes/productroute"));
const categoryroute_1 = __importDefault(require("./routes/categoryroute"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Database connection
const MONGODB_URI = process.env.MONGODB_URI || "";
mongoose_1.default.connect(MONGODB_URI)
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
app.use("/api/products", productroute_1.default);
app.use("/api/Category", categoryroute_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
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
    mongoose_1.default.connection.close(false).then(() => {
        console.log("MongoDB connection closed");
        server.close(() => {
            console.log("Server closed");
            process.exit(0);
        });
    });
});
