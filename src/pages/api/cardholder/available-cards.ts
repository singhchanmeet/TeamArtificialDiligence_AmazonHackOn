// /api/cardholder/available-cards - Find cards for discount matching
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import Cardholder from '../../../models/Cardholder';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await dbConnect();

  try {
    const { categories, requestType } = req.body;
    
    // Find all cardholders with matching categories
    const query = requestType === 'immediate' 
      ? { isOnline: true, 'cards.categories': { $in: categories }, 'cards.isActive': true }
      : { 'cards.categories': { $in: categories }, 'cards.isActive': true };
    
    const cardholders = await Cardholder.find(query);
    
    // Extract and format available cards
    const availableCards = [];
    
    cardholders.forEach(cardholder => {
      cardholder.cards.forEach(card => {
        if (card.isActive && card.categories.some(cat => categories.includes(cat))) {
          availableCards.push({
            id: card.id,
            cardholderEmail: cardholder.userId,
            bankName: card.bankName,
            cardType: card.cardType,
            categories: card.categories,
            discountPercentage: card.discountPercentage,
            isOnline: cardholder.isOnline,
            lastFourDigits: card.lastFourDigits
          });
        }
      });
    });
    
    // Sort by discount percentage (highest first)
    availableCards.sort((a, b) => b.discountPercentage - a.discountPercentage);
    
    res.status(200).json(availableCards);
  } catch (error) {
    console.error('Error fetching available cards:', error);
    res.status(500).json({ error: 'Failed to fetch available cards' });
  }
}
