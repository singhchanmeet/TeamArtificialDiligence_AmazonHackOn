// /api/payment-request/stats - Provides earnings statistics
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import PaymentRequest from '../../../models/PaymentRequest';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { expireOldRequests } from '../../../utils/expireOldRequests';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Expire old requests before processing
  await expireOldRequests();

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await dbConnect();

  try {
    const userEmail = session.user?.email;
    
    // Get statistics for the cardholder
    const stats = await PaymentRequest.aggregate([
      {
        $match: {
          cardholderEmail: userEmail,
          status: { $in: ['accepted', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalEarnings: { $sum: '$commissionAmount' },
          totalDiscountGiven: { $sum: '$discountAmount' },
          totalOrderValue: { $sum: '$orderAmount' },
          averageCommission: { $avg: '$commissionAmount' }
        }
      }
    ]);
    
    // Get monthly earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const monthlyStats = await PaymentRequest.aggregate([
      {
        $match: {
          cardholderEmail: userEmail,
          status: { $in: ['accepted', 'completed'] },
          acceptedAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          monthlyEarnings: { $sum: '$commissionAmount' },
          monthlyRequests: { $sum: 1 }
        }
      }
    ]);
    
    // Get pending earnings (accepted but not completed)
    const pendingStats = await PaymentRequest.aggregate([
      {
        $match: {
          cardholderEmail: userEmail,
          status: 'accepted'
        }
      },
      {
        $group: {
          _id: null,
          pendingEarnings: { $sum: '$commissionAmount' },
          pendingRequests: { $sum: 1 }
        }
      }
    ]);
    
    const response = {
      total: stats[0] || { totalRequests: 0, totalEarnings: 0 },
      monthly: monthlyStats[0] || { monthlyEarnings: 0, monthlyRequests: 0 },
      pending: pendingStats[0] || { pendingEarnings: 0, pendingRequests: 0 }
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}