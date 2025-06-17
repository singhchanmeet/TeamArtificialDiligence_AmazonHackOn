// /api/payment-request/list - List requests for users/cardholders
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import PaymentRequest from '../../../models/PaymentRequest';
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

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await dbConnect();

  try {
    const { role } = req.query; // 'cardholder' or 'user'
    
    let query: any = {};
    
    if (role === 'cardholder') {
      // Get requests for this cardholder
      query = {
        cardholderEmail: session.user?.email,
        status: 'pending',
        expiryTime: { $gt: new Date() }
      };
    } else {
      // Get requests created by this user
      query = {
        userEmail: session.user?.email
      };
    }
    
    const requests = await PaymentRequest.find(query).sort({ createdAt: -1 });
    
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching payment requests:', error);
    res.status(500).json({ error: 'Failed to fetch payment requests' });
  }
}
