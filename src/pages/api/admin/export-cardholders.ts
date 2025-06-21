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
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user.isAdmin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await dbConnect();

    const cardholders = await Cardholder.find().sort({ updatedAt: -1 }).lean();

    // Create CSV content
    let csv = 'Name,Email,Status,Total Cards,Active Cards,Total Earnings,This Month Earnings,Pending Earnings,Last Active,Registered Date\n';
    
    cardholders.forEach(cardholder => {
      const activeCards = cardholder.cards.filter(card => card.isActive).length;
      const status = cardholder.isOnline ? 'Online' : 'Offline';
      const lastActive = new Date(cardholder.lastActiveAt).toLocaleDateString();
      const registered = new Date(cardholder.registeredAt).toLocaleDateString();
      
      csv += `"${cardholder.name}","${cardholder.userId}","${status}",${cardholder.cards.length},${activeCards},${cardholder.earnings.total},${cardholder.earnings.thisMonth},${cardholder.earnings.pending},"${lastActive}","${registered}"\n`;
    });

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="cardholders-${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.status(200).send(csv);

  } catch (error) {
    console.error('Error exporting cardholders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 