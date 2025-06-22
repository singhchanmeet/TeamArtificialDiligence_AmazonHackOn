import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Rating from '@/models/Rating';
import Order from '@/models/Order';
import PaymentRequest from '@/models/PaymentRequest';
import Cardholder from '@/models/Cardholder';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await dbConnect();

    const {
      orderId,
      ratings,
      comment
    } = req.body;

    if (!orderId || !ratings) {
      return res.status(400).json({
        message: 'Missing required fields: orderId and ratings'
      });
    }

    const requiredRatings = ['discountQuality', 'responseTime', 'communication', 'overallExperience'];
    for (const rating of requiredRatings) {
      if (!ratings[rating] || ratings[rating] < 1 || ratings[rating] > 5) {
        return res.status(400).json({
          message: `Invalid rating for ${rating}. Must be between 1 and 5.`
        });
      }
    }

    const order = await Order.findOne({
      orderId,
      userEmail: session.user?.email
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.cardDiscountRequestId) {
      return res.status(400).json({
        message: 'This order did not use card discount service'
      });
    }

    const existingRating = await Rating.findOne({ orderId });
    if (existingRating) {
      return res.status(400).json({
        message: 'Rating already submitted for this order'
      });
    }

    const paymentRequest = await PaymentRequest.findOne({
      requestId: order.cardDiscountRequestId
    });

    if (!paymentRequest) {
      return res.status(404).json({ message: 'Payment request not found' });
    }

    let cardholderName = 'Unknown Cardholder';
    let cardDetails = {
      bankName: 'Unknown Bank',
      cardType: 'Unknown',
      lastFourDigits: '****'
    };

    const cardholder = await Cardholder.findOne({ userId: paymentRequest.cardholderEmail });
    if (cardholder) {
      cardholderName = cardholder.name || 'Unknown Cardholder';

      const card = cardholder.cards?.find(c => c.id === paymentRequest.cardId);
      if (card) {
        cardDetails = {
          bankName: card.bankName || 'Unknown Bank',
          cardType: card.cardType || 'Unknown',
          lastFourDigits: card.lastFourDigits || '****'
        };
      }
    }

    const totalRating =
      (ratings.discountQuality || 0) +
      (ratings.responseTime || 0) +
      (ratings.communication || 0) +
      (ratings.overallExperience || 0);
    const averageRating = totalRating > 0 ? totalRating / 4 : 0;

    const rating = new Rating({
      orderId,
      customerEmail: session.user?.email,
      cardholderEmail: paymentRequest.cardholderEmail,
      cardholderName,
      cardId: paymentRequest.cardId,
      cardDetails,
      ratings,
      averageRating,
      comment: comment || '',
      orderAmount: order.totalAmount,
      discountAmount: order.cardDiscount
    });

    await rating.save();

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      rating: {
        orderId: rating.orderId,
        averageRating: rating.averageRating,
        createdAt: rating.createdAt
      }
    });

  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development'
        ? (typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : undefined)
        : undefined
    });
  }
} 