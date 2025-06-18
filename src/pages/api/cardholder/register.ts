// /api/cardholder/register - Register new cards
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
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

  await dbConnect();

  if (req.method === 'POST') {
    try {
      const { card } = req.body;
      const userEmail = session.user?.email;
      
      // Simulate tokenization
      const tokenId = `TKN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const cardData = {
        id: `CARD_${Date.now()}`,
        lastFourDigits: card.cardNumber.slice(-4),
        cardType: card.cardType,
        bankName: card.bankName,
        categories: card.categories,
        discountPercentage: card.discountPercentage,
        monthlyLimit: card.monthlyLimit,
        currentMonthSpent: 0,
        tokenId,
        isActive: true
      };

      // Find or create cardholder
      let cardholder = await Cardholder.findOne({ userId: userEmail });
      
      if (cardholder) {
        cardholder.cards.push(cardData);
      } else {
        cardholder = new Cardholder({
          userId: userEmail,
          name: session.user?.name || '',
          cards: [cardData],
          isOnline: true,
          lastActiveAt: new Date(),
        });
      }
      
      await cardholder.save();
      
      res.status(200).json({ success: true, cardholder });
    } catch (error) {
      console.error('Error registering card:', error);
      res.status(500).json({ error: 'Failed to register card' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
