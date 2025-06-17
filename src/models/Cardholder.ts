// Cardholder.ts: Stores cardholder information, registered cards, earnings
import mongoose from 'mongoose';

const CardSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  lastFourDigits: { type: String, required: true },
  cardType: { type: String, required: true },
  bankName: { type: String, required: true },
  categories: [{ type: String }],
  discountPercentage: { type: Number, required: true },
  monthlyLimit: { type: Number, required: true },
  currentMonthSpent: { type: Number, default: 0 },
  tokenId: { type: String, required: true },
  isActive: { type: Boolean, default: true }
});

const CardholderSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // email
  name: { type: String, required: true },
  cards: [CardSchema],
  isOnline: { type: Boolean, default: false },
  earnings: {
    total: { type: Number, default: 0 },
    thisMonth: { type: Number, default: 0 },
    pending: { type: Number, default: 0 }
  },
  registeredAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

CardholderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Cardholder || mongoose.model('Cardholder', CardholderSchema);
