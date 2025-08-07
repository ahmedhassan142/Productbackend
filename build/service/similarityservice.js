"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimilarityService = void 0;
// similarity.service.ts (optimized)
const product_1 = __importDefault(require("../models/product"));
class SimilarityService {
    constructor() {
        this.defaultWeights = {
            category: 0.4,
            material: 0.3,
            price: 0.2,
            colors: 0.1
        };
    }
    getSimilarProducts(productId_1) {
        return __awaiter(this, arguments, void 0, function* (productId, weights = {}, limit = 6) {
            const targetProduct = yield product_1.default.findById(productId);
            if (!targetProduct)
                return [];
            const finalWeights = Object.assign(Object.assign({}, this.defaultWeights), weights);
            // Find products in same category first to reduce dataset
            const candidateProducts = yield product_1.default.find({
                _id: { $ne: productId },
                category: targetProduct.category
            }).limit(100); // Limit candidates for performance
            // If not enough in same category, expand search
            if (candidateProducts.length < limit * 2) {
                const additionalProducts = yield product_1.default.find({
                    _id: { $ne: productId },
                    category: { $ne: targetProduct.category }
                }).limit(50);
                candidateProducts.push(...additionalProducts);
            }
            return candidateProducts
                .map((product) => ({
                product,
                score: this.calculateSimilarity(targetProduct, product, finalWeights)
            }))
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        });
    }
    calculateSimilarity(productA, productB, weights) {
        let score = 0;
        // Category match
        if (productA.category === productB.category) {
            score += weights.category;
        }
        // Material match
        if (productA.material === productB.material) {
            score += weights.material;
        }
        // Price proximity (normalized to 0-1)
        const maxPriceDiff = 200; // Adjust based on your product price range
        const priceDiff = Math.abs(productA.price - productB.price);
        score += weights.price * (1 - Math.min(priceDiff / maxPriceDiff, 1));
        // Color overlap (Jaccard similarity)
        const colorSetA = new Set(productA.colors);
        const colorSetB = new Set(productB.colors);
        const intersection = [...colorSetA].filter(c => colorSetB.has(c)).length;
        const union = new Set([...productA.colors, ...productB.colors]).size;
        score += weights.colors * (union > 0 ? intersection / union : 0);
        return score;
    }
}
exports.SimilarityService = SimilarityService;
