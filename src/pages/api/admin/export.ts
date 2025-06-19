// /api/admin/export - Generates CSV reports
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import connectDb from "../../../lib/mongodb";
import Order from "@/models/Order";
import Cardholder from "@/models/Cardholder";
import PaymentRequest from "@/models/PaymentRequest";

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

    const { range = '7days' } = req.query;
    
    // Calculate date range
    let startDate = new Date();
    switch (range) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    // Get all data
    const orders = await Order.find({
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });

    const paymentRequests = await PaymentRequest.find({
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });

    const cardholders = await Cardholder.find();

    // Create CSV content
    let csv = 'Admin Report\n';
    csv += `Generated on: ${new Date().toLocaleString()}\n`;
    csv += `Date Range: ${range}\n\n`;

    // Summary Section
    csv += 'SUMMARY\n';
    csv += `Total Orders,${orders.length}\n`;
    csv += `Total Revenue,${orders.reduce((sum, o) => sum + o.finalAmount, 0)}\n`;
    csv += `Total Cardholders,${cardholders.length}\n`;
    csv += `Active Cardholders,${cardholders.filter(c => c.cards.length > 0).length}\n`;
    csv += `Total Payment Requests,${paymentRequests.length}\n`;
    csv += `Accepted Requests,${paymentRequests.filter(pr => pr.status === 'accepted' || pr.status === 'completed').length}\n\n`;

    // Orders Section
    csv += 'ORDERS\n';
    csv += 'Order ID,User Email,Total Amount,Discount,Final Amount,Status,Date\n';
    orders.forEach(order => {
      csv += `${order.orderId},${order.userEmail},${order.totalAmount},${order.cardDiscount + order.promotionDiscount},${order.finalAmount},${order.status},${new Date(order.createdAt).toLocaleString()}\n`;
    });
    csv += '\n';

    // Payment Requests Section
    csv += 'PAYMENT REQUESTS\n';
    csv += 'Request ID,Order ID,User,Cardholder,Discount,Commission,Status,Date\n';
    paymentRequests.forEach(request => {
      csv += `${request.requestId},${request.orderId},${request.userName},${request.cardholderEmail},${request.discountAmount},${request.commissionAmount},${request.status},${new Date(request.createdAt).toLocaleString()}\n`;
    });
    csv += '\n';

    // Cardholders Section
    csv += 'CARDHOLDERS\n';
    csv += 'Email,Name,Cards,Total Earnings,Online,Registered Date\n';
    cardholders.forEach(cardholder => {
      csv += `${cardholder.userId},${cardholder.name},${cardholder.cards.length},${cardholder.earnings.total},${cardholder.isOnline},${new Date(cardholder.registeredAt).toLocaleString()}\n`;
    });

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="admin-report-${new Date().toISOString().split('T')[0]}.csv"`);
    
    return res.status(200).send(csv);

  } catch (error) {
    console.error("Admin export error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default handler;