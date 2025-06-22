// /api/order/[orderId] - Get specific order details
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import PaymentRequest from '@/models/PaymentRequest';
import Cardholder from '@/models/Cardholder';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { orderId } = req.query;

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    await dbConnect();

    // Find the order
    const order = await Order.findOne({ 
      orderId, 
      userEmail: session.user?.email 
    }).lean();

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // If order used card discount, get payment request details
    let paymentRequest: any = null;
    if (order && !Array.isArray(order) && order.cardDiscountRequestId) {
      paymentRequest = await PaymentRequest.findOne({
        requestId: order.cardDiscountRequestId
      }).lean();
      if (Array.isArray(paymentRequest)) {
        paymentRequest = null;
      }

      // If payment request found, get cardholder details
      if (paymentRequest) {
        try {
          const cardholder = await Cardholder.findOne({ 
            userId: paymentRequest.cardholderEmail 
          }).lean();

          if (cardholder && !Array.isArray(cardholder)) {
            const card = cardholder.cards?.find(c => c.id === paymentRequest.cardId);
            paymentRequest = {
              ...paymentRequest,
              cardholderName: cardholder.name || 'Unknown Cardholder',
              cardDetails: card ? {
                bankName: card.bankName || 'Unknown Bank',
                cardType: card.cardType || 'Unknown',
                lastFourDigits: card.lastFourDigits || '****'
              } : {
                bankName: 'Unknown Bank',
                cardType: 'Unknown',
                lastFourDigits: '****'
              }
            };
          }
        } catch (error) {
          console.log('Error fetching cardholder details:', error);
          // Use default values
          paymentRequest = {
            ...paymentRequest,
            cardholderName: 'Unknown Cardholder',
            cardDetails: {
              bankName: 'Unknown Bank',
              cardType: 'Unknown',
              lastFourDigits: '****'
            }
          };
        }
      }
    }

    // Prepare response
    if (!order || Array.isArray(order)) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const orderDetails = {
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      cardDiscount: order.cardDiscount,
      cardDiscountRequestId: order.cardDiscountRequestId,
      paymentRequest: paymentRequest ? {
        cardholderName: paymentRequest.cardholderName,
        cardDetails: paymentRequest.cardDetails
      } : null
    };

    res.status(200).json(orderDetails);

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' 
        ? (typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : undefined)
        : undefined
    });
  }
}
