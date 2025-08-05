// popularity.service.ts
import Product from '../models/product';
import Interaction from '../models/Interaction';

export class PopularityService {
  async getPopularProducts(limit: number = 6) {
    return Interaction.aggregate([
      { 
        $match: { 
          type: { $in: ['view', 'purchase'] },
          createdAt: { $gt: new Date(Date.now() - 30*24*60*60*1000) } // Last 30d
        }
      },
      { $group: { _id: '$product', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $replaceRoot: { newRoot: '$product' } }
    ]);
  }
}