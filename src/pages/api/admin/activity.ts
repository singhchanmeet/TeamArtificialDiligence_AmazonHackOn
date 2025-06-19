// /api/admin/activity - Returns recent activity
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import connectDb from "../../../lib/mongodb";
import Order from "@/models/Order";
import Cardholder from "@/models/Cardholder";
import PaymentRequest from "@/models/PaymentRequest";

interface Activity {
  type: 'order' | 'payment_request' | 'cardholder';
  message: string;
  timestamp: Date;
  amount?: number;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user.isAdmin) {
      return res.status(401).json({ error: "Unauthorized - Admin access required" });
    }

    await connectDb();

    const activities: Activity[] = [];
    
    // Get recent orders (last 10)
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10);
    
    recentOrders.forEach(order => {
      activities.push({
        type: 'order',
        message: `New order #${order.orderId} placed by ${order.userEmail}`,
        timestamp: order.createdAt,
        amount: order.finalAmount
      });
    });

    // Get recent payment requests (last 10)
    const recentPaymentRequests = await PaymentRequest.find()
      .sort({ createdAt: -1 })
      .limit(10);
    
    recentPaymentRequests.forEach(request => {
      let message = '';
      if (request.status === 'pending') {
        message = `New payment request from ${request.userName}`;
      } else if (request.status === 'accepted') {
        message = `Payment request accepted by ${request.cardholderEmail}`;
      } else if (request.status === 'expired') {
        message = `Payment request expired for order #${request.orderId}`;
      }
      
      activities.push({
        type: 'payment_request',
        message,
        timestamp: request.createdAt,
        amount: request.status === 'accepted' ? request.commissionAmount : undefined
      });
    });

    // Get recent cardholder registrations (last 5)
    const recentCardholders = await Cardholder.find()
      .sort({ registeredAt: -1 })
      .limit(5);
    
    recentCardholders.forEach(cardholder => {
      activities.push({
        type: 'cardholder',
        message: `New cardholder registered: ${cardholder.name}`,
        timestamp: cardholder.registeredAt
      });
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Return top 20 activities
    return res.status(200).json(activities.slice(0, 20));

  } catch (error) {
    console.error("Admin activity error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default handler;