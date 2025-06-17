// /api/payment-request/accept - Accept payment requests
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import PaymentRequest from '../../../models/PaymentRequest';
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

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await dbConnect();

  try {
    const { requestId } = req.body;
    
    // Find and update the payment request
    const paymentRequest = await PaymentRequest.findOne({ requestId });
    
    if (!paymentRequest) {
      return res.status(404).json({ error: 'Payment request not found' });
    }
    
    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request is no longer pending' });
    }
    
    if (new Date() > paymentRequest.expiryTime) {
      paymentRequest.status = 'expired';
      await paymentRequest.save();
      return res.status(400).json({ error: 'Request has expired' });
    }
    
    // Update request status
    paymentRequest.status = 'accepted';
    paymentRequest.acceptedAt = new Date();
    await paymentRequest.save();
    
    // Update cardholder earnings
    const cardholder = await Cardholder.findOne({ userId: session.user?.email });
    if (cardholder) {
      cardholder.earnings.pending += paymentRequest.commissionAmount;
      await cardholder.save();
    }
    
    res.status(200).json({ success: true, paymentRequest });
  } catch (error) {
    console.error('Error accepting payment request:', error);
    res.status(500).json({ error: 'Failed to accept payment request' });
  }
}
