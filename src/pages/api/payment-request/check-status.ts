// /api/payment-request/check-status - Check for accepted/declined requests by order ID
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import PaymentRequest from '../../../models/PaymentRequest';
import { expireOldRequests } from '../../../utils/expireOldRequests';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Expire old requests before processing
  await expireOldRequests();

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
    
    // Find declined payment requests for this order ID
    const declinedRequests = await PaymentRequest.find({
      orderId,
      status: 'declined'
    }).sort({ declinedAt: -1 });
    
    // Find all pending requests for this order ID (for debugging/monitoring)
    const pendingRequests = await PaymentRequest.find({
      orderId,
      status: 'pending'
    }).sort({ createdAt: -1 });
    
    res.status(200).json({ 
      acceptedRequest,
      declinedRequests,
      pendingRequests,
      hasDeclined: declinedRequests.length > 0,
      hasPending: pendingRequests.length > 0
    });
  } catch (error) {
    console.error('Error checking payment request status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
}