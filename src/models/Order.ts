// Order.ts: Stores order information with card discount tracking
import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  userEmail: { type: String, required: true },
  items: [{
    id: Number,
    title: String,
    price: Number,
    category: String,
    image: String,
    quantity: Number
  }],
  deliveryAddress: {
    name: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: String,
    phone: String
  },
  paymentMethod: {
    type: {
      id: String,
      type: String,
      name: String,
      details: String
    },
  },
  totalAmount: { type: Number, required: true },
  deliveryCharges: { type: Number, default: 0 },
  promotionDiscount: { type: Number, default: 0 },
  cardDiscount: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },
  cardDiscountRequestId: { type: String },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

OrderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
