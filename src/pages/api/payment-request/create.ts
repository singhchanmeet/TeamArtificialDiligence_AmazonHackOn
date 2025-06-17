// /api/payment-request/create - Create new payment requests
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import PaymentRequest from '../../../models/PaymentRequest';
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
    const {
      selectedCard,
      products,
      totalAmount,
      discountAmount,
      commissionAmount,
      requestType
    } = req.body;
    
    const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const orderId = `ORD_${Date.now()}`;
    
    const paymentRequest = new PaymentRequest({
      requestId,
      orderId,
      userId: session.user?.email,
      userName: session.user?.name || 'User',
      userEmail: session.user?.email,
      productDetails: products.map((p: any) => ({
        title: p.title,
        category: p.category,
        quantity: p.quantity
      })),
      orderAmount: totalAmount,
      discountAmount,
      commissionAmount,
      totalPayable: totalAmount - discountAmount,
      cardId: selectedCard.id,
      cardholderEmail: selectedCard.cardholderEmail,
      expiryTime: new Date(Date.now() + (requestType === 'immediate' ? 5 * 60000 : 30 * 60000)),
      requestType
    });
    
    await paymentRequest.save();
    
    // TODO: Send email notification to cardholder
    // For now, we'll just log it
    console.log('Email notification would be sent to:', selectedCard.cardholderEmail);
    
    res.status(200).json({ success: true, paymentRequest });
  } catch (error) {
    console.error('Error creating payment request:', error);
    res.status(500).json({ error: 'Failed to create payment request' });
  }
}