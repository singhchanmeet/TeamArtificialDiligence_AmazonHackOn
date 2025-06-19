// /api/payment-request/history - Fetches earnings history
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
    const { role } = req.query;
    
    let query: any = {};
    
    if (role === 'cardholder') {
      // Get accepted and completed requests for this cardholder
      query = {
        cardholderEmail: session.user?.email,
        status: { $in: ['accepted', 'completed'] }
      };
    } else {
      // Get all completed transactions for this user
      query = {
        userEmail: session.user?.email,
        status: 'completed'
      };
    }
    
    const requests = await PaymentRequest.find(query)
      .sort({ completedAt: -1, acceptedAt: -1, createdAt: -1 })
      .limit(100); // Limit to last 100 transactions
    
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching earnings history:', error);
    res.status(500).json({ error: 'Failed to fetch earnings history' });
  }
}
