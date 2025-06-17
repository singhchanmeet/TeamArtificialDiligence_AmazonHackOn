// /api/cardholder/profile - Get/update cardholder profile
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

  if (req.method === 'GET') {
    try {
      const cardholder = await Cardholder.findOne({ userId: session.user?.email });
      
      if (!cardholder) {
        return res.status(404).json({ error: 'Cardholder not found' });
      }
      
      res.status(200).json(cardholder);
    } catch (error) {
      console.error('Error fetching cardholder:', error);
      res.status(500).json({ error: 'Failed to fetch cardholder data' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { isOnline } = req.body;
      
      const cardholder = await Cardholder.findOneAndUpdate(
        { userId: session.user?.email },
        { isOnline, updatedAt: new Date() },
        { new: true }
      );
      
      res.status(200).json(cardholder);
    } catch (error) {
      console.error('Error updating cardholder:', error);
      res.status(500).json({ error: 'Failed to update cardholder' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
