// similarity.service.ts (optimized)
import Product,{IProduct} from '../models/product';

type SimilarityWeights = {
  category: number;
  material: number;
  price: number;
  colors: number;
};

export class SimilarityService {
  private defaultWeights: SimilarityWeights = {
    category: 0.4,
    material: 0.3,
    price: 0.2,
    colors: 0.1
  };

  async getSimilarProducts(
    productId: string,
    weights: Partial<SimilarityWeights> = {},
    limit: number = 6
  ) {
    const targetProduct = await Product.findById(productId);
    if (!targetProduct) return [];

    const finalWeights = { ...this.defaultWeights, ...weights };

    // Find products in same category first to reduce dataset
    const candidateProducts = await Product.find({
      _id: { $ne: productId },
      category: targetProduct.category
    }).limit(100); // Limit candidates for performance

    // If not enough in same category, expand search
    if (candidateProducts.length < limit * 2) {
      const additionalProducts = await Product.find({
        _id: { $ne: productId },
        category: { $ne: targetProduct.category }
      }).limit(50);
      candidateProducts.push(...additionalProducts);
    }

    return candidateProducts
      .map((product:any) => ({
        product,
        score: this.calculateSimilarity(targetProduct, product, finalWeights)
      }))
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateSimilarity(
    productA: IProduct,
    productB: IProduct,
    weights: SimilarityWeights
  ):number {
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