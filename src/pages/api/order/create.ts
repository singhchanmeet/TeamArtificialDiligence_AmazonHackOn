// /api/order/create - Create orders with transaction support
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import Order from '../../../models/Order';
import PaymentRequest from '../../../models/PaymentRequest';
import Cardholder from '../../../models/Cardholder';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await dbConnect();

  const session_started = await mongoose.startSession();
  session_started.startTransaction();

  try {
    const {
      items,
      deliveryAddress,
      paymentMethod,
      totalAmount,
      deliveryCharges,
      promotionDiscount,
      cardDiscount,
      cardDiscountRequestId
    } = req.body;
    
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const finalAmount = totalAmount + deliveryCharges - promotionDiscount - cardDiscount;
    
    // Create order
    const order = new Order({
      orderId,
      userEmail: session.user?.email,
      items,
      deliveryAddress,
      paymentMethod,
      totalAmount,
      deliveryCharges,
      promotionDiscount,
      cardDiscount,
      finalAmount,
      cardDiscountRequestId
    });
    
    await order.save({ session: session_started });
    
    // If card discount was used, update the payment request
    if (cardDiscountRequestId) {
      const paymentRequest = await PaymentRequest.findOne({ 
        requestId: cardDiscountRequestId 
      }).session(session_started);
      
      if (paymentRequest) {
        paymentRequest.status = 'completed';
        paymentRequest.completedAt = new Date();
        await paymentRequest.save({ session: session_started });
        
        // Update cardholder earnings
        const cardholder = await Cardholder.findOne({ 
          userId: paymentRequest.cardholderEmail 
        }).session(session_started);
        
        if (cardholder) {
          cardholder.earnings.total += paymentRequest.commissionAmount;
          cardholder.earnings.thisMonth += paymentRequest.commissionAmount;
          cardholder.earnings.pending -= paymentRequest.commissionAmount;
          
          // Update card spending
          const card = cardholder.cards.find(c => c.id === paymentRequest.cardId);
          if (card) {
            card.currentMonthSpent += paymentRequest.totalPayable;
          }
          
          await cardholder.save({ session: session_started });
        }
      }
    }
    
    await session_started.commitTransaction();
    
    res.status(200).json({ success: true, order });
  } catch (error) {
    await session_started.abortTransaction();
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    session_started.endSession();
  }
}
