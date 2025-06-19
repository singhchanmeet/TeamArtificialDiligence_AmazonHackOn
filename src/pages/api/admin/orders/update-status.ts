// /api/admin/orders/update-status - Updates order status
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import connectDb from "../../../../lib/mongodb";
import Order from "@/models/Order";
import PaymentRequest from "@/models/PaymentRequest";
import Cardholder from "@/models/Cardholder";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user.isAdmin) {
      return res.status(401).json({ error: "Unauthorized - Admin access required" });
    }

    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ error: "Order ID and status are required" });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await connectDb();

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const previousStatus = order.status;
    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    // If order is delivered and has a card discount, mark payment request as completed
    if (status === 'delivered' && order.cardDiscountRequestId) {
      const paymentRequest = await PaymentRequest.findOne({ 
        requestId: order.cardDiscountRequestId 
      });
      
      if (paymentRequest && paymentRequest.status === 'accepted') {
        paymentRequest.status = 'completed';
        paymentRequest.completedAt = new Date();
        await paymentRequest.save();

        // Update cardholder earnings
        const cardholder = await Cardholder.findOne({ 
          userId: paymentRequest.cardholderEmail 
        });
        
        if (cardholder) {
          cardholder.earnings.pending -= paymentRequest.commissionAmount;
          cardholder.earnings.total += paymentRequest.commissionAmount;
          cardholder.earnings.thisMonth += paymentRequest.commissionAmount;
          await cardholder.save();
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      order,
      message: `Order status updated from ${previousStatus} to ${status}`
    });

  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default handler;