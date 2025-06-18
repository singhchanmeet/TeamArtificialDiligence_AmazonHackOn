// /api/payment-request/expired - Fetches expired requests
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
    const { role } = req.query;
    
    let query: any = {};
    
    if (role === 'cardholder') {
      // Get expired requests for this cardholder
      query = {
        cardholderEmail: session.user?.email,
        status: 'expired'
      };
    } else {
      // Get expired requests created by this user
      query = {
        userEmail: session.user?.email,
        status: 'expired'
      };
    }
    
    const requests = await PaymentRequest.find(query)
      .sort({ expiryTime: -1 })
      .limit(50); // Limit to last 50 expired requests
    
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching expired requests:', error);
    res.status(500).json({ error: 'Failed to fetch expired requests' });
  }
}