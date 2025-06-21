// PaymentRequest.ts: Manages payment requests between users and cardholders
import mongoose from 'mongoose';

const PaymentRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  orderId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  productDetails: [{
    title: String,
    category: String,
    quantity: Number
  }],
  orderAmount: { type: Number, required: true },
  discountAmount: { type: Number, required: true },
  commissionAmount: { type: Number, required: true },
  totalPayable: { type: Number, required: true },
  cardId: { type: String, required: true },
  cardholderEmail: { type: String, required: true },
  expiryTime: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'declined', 'expired', 'completed', 'cancelled'],
    default: 'pending'
  },
  requestType: {
    type: String,
    enum: ['immediate', 'scheduled'],
    required: true
  },
  declineReason: { type: String },
  declinedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  completedAt: { type: Date }
});

// Index for efficient queries
PaymentRequestSchema.index({ userEmail: 1, status: 1 });
PaymentRequestSchema.index({ cardholderEmail: 1, status: 1 });
PaymentRequestSchema.index({ expiryTime: 1 });

export default mongoose.models.PaymentRequest || mongoose.model('PaymentRequest', PaymentRequestSchema);
