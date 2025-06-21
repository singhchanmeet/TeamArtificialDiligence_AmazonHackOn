// /api/payment-request/decline.ts - Decline payment requests
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import PaymentRequest from '../../../models/PaymentRequest';
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

  // Expire old requests before processing
  await expireOldRequests();

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await dbConnect();

  try {
    const { requestId, reason } = req.body;
    
    // Find the payment request
    const paymentRequest = await PaymentRequest.findOne({ requestId });
    
    if (!paymentRequest) {
      return res.status(404).json({ error: 'Payment request not found' });
    }
    
    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request is no longer pending' });
    }
    
    // Check if the cardholder is authorized to decline this request
    if (paymentRequest.cardholderEmail !== session.user?.email) {
      return res.status(403).json({ error: 'Not authorized to decline this request' });
    }
    
    // Update request status to declined
    paymentRequest.status = 'declined';
    paymentRequest.declinedAt = new Date();
    paymentRequest.declineReason = reason || 'No reason provided';
    await paymentRequest.save();
    
    res.status(200).json({ success: true, paymentRequest });
  } catch (error) {
    console.error('Error declining payment request:', error);
    res.status(500).json({ error: 'Failed to decline payment request' });
  }
}