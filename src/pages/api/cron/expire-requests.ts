// /api/cron/expire-requests - Automatically expire old requests
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import PaymentRequest from '../../../models/PaymentRequest';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // TODO: Verify this is called by the Vercel Cron or not
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await dbConnect();

  try {
    // Find and update all expired pending requests
    const result = await PaymentRequest.updateMany(
      {
        status: 'pending',
        expiryTime: { $lt: new Date() }
      },
      {
        $set: { status: 'expired' }
      }
    );
    
    console.log(`Expired ${result.modifiedCount} payment requests`);
    
    res.status(200).json({ 
      success: true, 
      expiredCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error expiring requests:', error);
    res.status(500).json({ error: 'Failed to expire requests' });
  }
}