// /api/payment-request/create - Create new payment requests with integrated trust score
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import PaymentRequest from '../../../models/PaymentRequest';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { expireOldRequests } from '../../../utils/expireOldRequests';
import { generateUserTrustReport } from '../../../utils/trustScoreGenerator';

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
    const {
      selectedCard,
      products,
      totalAmount,
      discountAmount,
      commissionAmount,
      requestType,
      orderId, // Get orderId from request body
      city,
      device_type,
      merchant_category,
      payment_method
    } = req.body;
    
    const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Use the orderId passed from the frontend, or generate one if not provided
    const finalOrderId = orderId || `AMZ-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    const paymentRequest = new PaymentRequest({
      requestId,
      orderId: finalOrderId,
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
      requestType,
      city,
      device_type,
      merchant_category,
      payment_method
    });
    
    await paymentRequest.save();
    
    // --- Integrated Trust Score Analysis ---
    console.log('Starting trust score analysis for user:', session.user?.email);
    
    try {
      // 1. Fetch all previous requests for this user (by userId)
      const previousRequests = await PaymentRequest.find({ 
        userId: session.user?.email 
      }).sort({ createdAt: 1 });

      console.log(`Found ${previousRequests.length} previous requests for trust analysis`);

      // 2. Generate trust report using our local utility
      const trustReport = await generateUserTrustReport(session.user?.email, previousRequests);
      
      console.log('Trust report generated:', {
        trustScore: trustReport.trust_score,
        riskLevel: trustReport.risk_assessment?.overall_risk_level,
        riskFactors: trustReport.risk_assessment?.risk_factors?.length || 0
      });

      // 3. Save trustReport in the payment request
      if (trustReport && (!('error' in trustReport) || !trustReport.error)) {
        paymentRequest.trustReport = trustReport;
        await paymentRequest.save();
        console.log('Trust report saved to payment request');
      } else {
        console.warn('Trust report generation failed or returned error:', trustReport.message);
        // Save a basic trust report indicating analysis failure
        paymentRequest.trustReport = {
          user_id: session.user?.email,
          trust_score: 50,
          risk_assessment: {
            overall_risk_level: 'unknown',
            total_risk_score: 50,
            risk_factors: ['Analysis incomplete'],
            confidence_level: 'low'
          },
          analysis_metadata: {
            transactions_analyzed: previousRequests.length,
            analysis_version: "1.0.0",
            error: true,
            error_message: trustReport.message || 'Unknown error'
          },
          timestamp: new Date().toISOString()
        };
        await paymentRequest.save();
      }

    } catch (trustError) {
      console.error('Error during trust score analysis:', trustError);
      
      // Save a minimal trust report indicating system error
      paymentRequest.trustReport = {
        user_id: session.user?.email,
        trust_score: 50,
        risk_assessment: {
          overall_risk_level: 'unknown',
          total_risk_score: 50,
          risk_factors: ['System error during analysis'],
          confidence_level: 'low'
        },
        analysis_metadata: {
          transactions_analyzed: 0,
          analysis_version: "1.0.0",
          error: true,
          error_message: (typeof trustError === 'object' && trustError !== null && 'message' in trustError ? (trustError as any).message : 'Trust analysis system error')
        },
        timestamp: new Date().toISOString()
      };
      await paymentRequest.save();
      
      // Don't fail the request creation due to trust analysis error
      console.warn('Trust analysis failed, but continuing with request creation');
    }
    
    // TODO: Send email notification to cardholder
    // For now, we'll just log it
    console.log('Email notification would be sent to:', selectedCard.cardholderEmail);
    console.log('Order ID:', finalOrderId);
    
    // Return success response
    res.status(200).json({ 
      success: true, 
      paymentRequest: {
        ...paymentRequest.toObject(),
        // Include trust score summary in response for debugging
        trustScoreSummary: paymentRequest.trustReport ? {
          score: paymentRequest.trustReport.trust_score,
          riskLevel: paymentRequest.trustReport.risk_assessment?.overall_risk_level,
          analysisComplete: !paymentRequest.trustReport.analysis_metadata?.error
        } : null
      }
    });
    
  } catch (error) {
    console.error('Error creating payment request:', error);
    res.status(500).json({ error: 'Failed to create payment request' });
  }
}