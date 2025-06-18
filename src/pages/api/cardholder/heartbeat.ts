// /api/cardholder/heartbeat.ts - Update cardholder heartbeat status
// This API endpoint updates the cardholder's heartbeat status to indicate they are online.
// It is called periodically by the client to keep the session active.
// TODO: Implement rate limiting to prevent abuse.
// TODO: ideally implement socket.io for real-time updates instead of polling.
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import Cardholder from '../../../models/Cardholder';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  await dbConnect();

  if (req.method === 'POST') {
    try {
      const updated = await Cardholder.findOneAndUpdate(
        { userId: session.user?.email },
        { isOnline: true, lastActiveAt: new Date() },
        { new: true }
      );
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update heartbeat' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
