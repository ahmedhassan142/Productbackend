import mongoose, { Document, Schema } from 'mongoose';

export enum InteractionType {
  VIEW = 'view',
  CART = 'cart',
  PURCHASE = 'purchase',
  WISHLIST = 'wishlist'
}

export interface IInteraction extends Document {
  user: Schema.Types.ObjectId;
  product: Schema.Types.ObjectId;
  type: InteractionType;
  metadata?: {
    referralSource?: string;
    deviceType?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const InteractionSchema: Schema = new Schema({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  product: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true,
    index: true 
  },
  type: { 
    type: String, 
    enum: Object.values(InteractionType), 
    required: true 
  },
  metadata: {
    referralSource: { type: String },
    deviceType: { type: String }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for frequent queries
InteractionSchema.index({ user: 1, type: 1 });
InteractionSchema.index({ product: 1, type: 1 });
InteractionSchema.index({ createdAt: -1 });

// Virtual populate (if you need to access interactions from Product or User)
InteractionSchema.virtual('productDetails', {
  ref: 'Product',
  localField: 'product',
  foreignField: '_id',
  justOne: true
});

const Interaction = mongoose.model<IInteraction>('Interaction', InteractionSchema);

export default Interaction;