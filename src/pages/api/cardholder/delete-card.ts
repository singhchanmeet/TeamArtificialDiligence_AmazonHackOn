// /api/cardholder/delete-card - Remove registered cards
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import Cardholder from '../../../models/Cardholder';
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

  // Clean up old requests before processing the delete card request
  await expireOldRequests();

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await dbConnect();

  try {
    const { cardId } = req.body;
    
    const cardholder = await Cardholder.findOne({ userId: session.user?.email });
    
    if (!cardholder) {
      return res.status(404).json({ error: 'Cardholder not found' });
    }
    
    cardholder.cards = cardholder.cards.filter(card => card.id !== cardId);
    await cardholder.save();
    
    res.status(200).json({ success: true, cardholder });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
}
