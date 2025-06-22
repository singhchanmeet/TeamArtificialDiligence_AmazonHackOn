// Rating.ts: Stores cardholder ratings from customers
import mongoose from 'mongoose';

const RatingSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customerEmail: { type: String, required: true },
  cardholderEmail: { type: String, required: true },
  cardholderName: { type: String, required: true },
  cardId: { type: String, required: true },
  cardDetails: {
    bankName: { type: String, default: 'Unknown Bank' },
    cardType: { type: String, default: 'Unknown' },
    lastFourDigits: { type: String, default: '****' }
  },
  ratings: {
    discountQuality: { type: Number, required: true, min: 1, max: 5 },
    responseTime: { type: Number, required: true, min: 1, max: 5 },
    communication: { type: Number, required: true, min: 1, max: 5 },
    overallExperience: { type: Number, required: true, min: 1, max: 5 }
  },
  averageRating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 500, default: '' },
  orderAmount: { type: Number, required: true },
  discountAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add indexes for better performance
// RatingSchema.index({ orderId: 1 });
RatingSchema.index({ customerEmail: 1 });
RatingSchema.index({ cardholderEmail: 1 });
RatingSchema.index({ createdAt: -1 });

export default mongoose.models.Rating || mongoose.model('Rating', RatingSchema); 