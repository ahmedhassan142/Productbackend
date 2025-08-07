"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractionType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var InteractionType;
(function (InteractionType) {
    InteractionType["VIEW"] = "view";
    InteractionType["CART"] = "cart";
    InteractionType["PURCHASE"] = "purchase";
    InteractionType["WISHLIST"] = "wishlist";
})(InteractionType || (exports.InteractionType = InteractionType = {}));
const InteractionSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const Interaction = mongoose_1.default.model('Interaction', InteractionSchema);
exports.default = Interaction;
