// hybrid.service.ts
import { PopularityService } from './popularityservice';
import { SimilarityService } from './similarityservice';


export class HybridRecommendationService {
  private popularityService: PopularityService;
  private similarityService: SimilarityService;

  constructor() {
    this.popularityService = new PopularityService();
    this.similarityService = new SimilarityService();
  }

  async getHybridRecommendations(productId?: string, limit: number = 6) {
    try {
      let recommendations = [];

      // If we have a product ID, get similar products
      if (productId) {
        const similarProducts = await this.similarityService.getSimilarProducts(productId);
        recommendations.push(...similarProducts.map((item :any)=> ({
          product: item.product,
          score: item.score * 0.7, // Weight similarity higher
          type: 'similarity'
        })));
      }

      // Always include popular products
      const popularProducts = await this.popularityService.getPopularProducts(limit);
      recommendations.push(...popularProducts.map((product:any) => ({
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
    } catch (error) {
      console.error('Error in hybrid recommendations:', error);
      // Fallback to just popular products if error occurs
      return this.popularityService.getPopularProducts(limit);
    }
  }

  async getPersonalizedHybridRecommendations(userId: string, limit: number = 6) {
    // This could be enhanced to consider user's past interactions
    return this.getHybridRecommendations(undefined, limit);
  }
}