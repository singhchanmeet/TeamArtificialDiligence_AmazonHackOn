import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '@/lib/mongodb';
import Rating from '@/models/Rating';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user.isAdmin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await dbConnect();

    // Get all ratings with pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const ratings = await Rating.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get basic stats
    const totalRatings = await Rating.countDocuments({});
    const averageRating = await Rating.aggregate([
      { $group: { _id: null, avg: { $avg: '$averageRating' } } }
    ]);

    const stats = {
      totalRatings,
      averageRating: averageRating.length > 0 ? averageRating[0].avg : 0,
      topRatedCardholders: await Rating.countDocuments({ averageRating: { $gte: 4.5 } }),
      recentRatings: await Rating.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    };

    res.status(200).json({
      ratings,
      stats,
      pagination: {
        page,
        limit,
        total: totalRatings,
        pages: Math.ceil(totalRatings / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 