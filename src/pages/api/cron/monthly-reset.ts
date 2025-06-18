// /api/cron/monthly-reset - Resets monthly card limits
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import Cardholder from '../../../models/Cardholder';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify this is called by your cron service
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
    // Reset all cards' monthly spending to 0
    const result = await Cardholder.updateMany(
      {},
      {
        $set: {
          'cards.$[].currentMonthSpent': 0,
          'earnings.thisMonth': 0
        }
      }
    );
    
    console.log(`Reset monthly spending for ${result.modifiedCount} cardholders`);
    
    res.status(200).json({ 
      success: true, 
      resetCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error resetting monthly limits:', error);
    res.status(500).json({ error: 'Failed to reset monthly limits' });
  }
}

// TODO
// Add this to vercel.json or set up as a scheduled job:
// Run on the 1st of every month at midnight
// "0 0 1 * *"