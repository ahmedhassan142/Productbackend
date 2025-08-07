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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridRecommendationService = void 0;
// hybrid.service.ts
const popularityservice_1 = require("./popularityservice");
const similarityservice_1 = require("./similarityservice");
class HybridRecommendationService {
    constructor() {
        this.popularityService = new popularityservice_1.PopularityService();
        this.similarityService = new similarityservice_1.SimilarityService();
    }
    getHybridRecommendations(productId_1) {
        return __awaiter(this, arguments, void 0, function* (productId, limit = 6) {
            try {
                let recommendations = [];
                // If we have a product ID, get similar products
                if (productId) {
                    const similarProducts = yield this.similarityService.getSimilarProducts(productId);
                    recommendations.push(...similarProducts.map((item) => ({
                        product: item.product,
                        score: item.score * 0.7, // Weight similarity higher
                        type: 'similarity'
                    })));
                }
                // Always include popular products
                const popularProducts = yield this.popularityService.getPopularProducts(limit);
                recommendations.push(...popularProducts.map((product) => ({
                    product,
                    score: 0.3, // Base weight for popularity
                    type: 'popularity'
                })));
                // Deduplicate and sort
                const seenProducts = new Set();
                const finalRecommendations = recommendations
                    .filter(item => {
                    if (seenProducts.has(item.product._id.toString())) {
                        return false;
                    }
                    seenProducts.add(item.product._id.toString());
                    return true;
                })
                    .sort((a, b) => b.score - a.score)
                    .slice(0, limit);
                return finalRecommendations.map(item => item.product);
            }
            catch (error) {
                console.error('Error in hybrid recommendations:', error);
                // Fallback to just popular products if error occurs
                return this.popularityService.getPopularProducts(limit);
            }
        });
    }
    getPersonalizedHybridRecommendations(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, limit = 6) {
            // This could be enhanced to consider user's past interactions
            return this.getHybridRecommendations(undefined, limit);
        });
    }
}
exports.HybridRecommendationService = HybridRecommendationService;
