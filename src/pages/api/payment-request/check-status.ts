// /api/payment-request/check-status - Check for accepted requests by order ID
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import PaymentRequest from '../../../models/PaymentRequest';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await dbConnect();

  try {
    const { orderId } = req.query;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    // Find accepted payment requests for this order ID
    const acceptedRequest = await PaymentRequest.findOne({
      orderId,
      status: 'accepted'
    }).sort({ acceptedAt: -1 });
    
    res.status(200).json({ acceptedRequest });
  } catch (error) {
    console.error('Error checking payment request status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
}