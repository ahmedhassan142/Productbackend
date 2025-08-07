"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const productSchema = new mongoose_1.default.Schema({
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
        type: mongoose_1.default.Schema.Types.ObjectId,
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
productSchema.index({
    name: 'text',
    description: 'text',
    material: 'text',
    fit: 'text'
}, {
    weights: {
        name: 5, // Higher weight for name
        description: 1,
        material: 2,
        fit: 2
    },
    name: 'product_text_search'
});
const Product = mongoose_1.default.model('Product', productSchema);
exports.default = Product;
