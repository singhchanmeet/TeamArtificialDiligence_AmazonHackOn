import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import Cardholder from '@/models/Cardholder';
import dbConnect from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Cardholders API: Starting request');
    
    const session = await getServerSession(req, res, authOptions);
    console.log('Cardholders API: Session check', { 
      hasSession: !!session, 
      isAdmin: session?.user?.isAdmin 
    });
    
    if (!session || !session.user.isAdmin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('Cardholders API: Connecting to database');
    await dbConnect();
    console.log('Cardholders API: Database connected');

    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    console.log('Cardholders API: Query params', { page, limit, search, status, skip });

    // Build query
    let query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'online') {
      query.isOnline = true;
    } else if (status === 'offline') {
      query.isOnline = false;
    }

    console.log('Cardholders API: Final query', query);

    // Get total count for pagination
    console.log('Cardholders API: Counting documents');
    const total = await Cardholder.countDocuments(query);
    console.log('Cardholders API: Total count', total);

    // Get cardholders with pagination
    console.log('Cardholders API: Fetching cardholders');
    const cardholders = await Cardholder.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();
    console.log('Cardholders API: Fetched cardholders', cardholders.length);

    // Calculate additional stats with better error handling
    console.log('Cardholders API: Calculating stats');
    let totalCards = 0;
    try {
      const cardsResult = await Cardholder.aggregate([
        { $unwind: '$cards' },
        { $count: 'total' }
      ]);
      totalCards = cardsResult[0]?.total || 0;
      console.log('Cardholders API: Aggregation result', totalCards);
    } catch (aggregateError) {
      console.error('Error in aggregation:', aggregateError);
      // Fallback: count cards manually
      const allCardholders = await Cardholder.find({}, 'cards').lean();
      totalCards = allCardholders.reduce((sum, ch) => sum + (ch.cards?.length || 0), 0);
      console.log('Cardholders API: Fallback total cards', totalCards);
    }

    const stats = {
      total: await Cardholder.countDocuments(),
      online: await Cardholder.countDocuments({ isOnline: true }),
      active: await Cardholder.countDocuments({ 'cards.isActive': true }),
      totalCards: totalCards
    };
    
    console.log('Cardholders API: Final stats', stats);

    const response = {
      cardholders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      stats
    };

    console.log('Cardholders API: Sending response');
    res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching cardholders:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 