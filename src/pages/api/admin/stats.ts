// /api/admin/stats - Fetches platform statistics
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

    // Get Orders Stats
    const orders = await Order.find();
    const ordersInRange = orders.filter(order => 
      new Date(order.createdAt) >= startDate
    );

    const totalRevenue = orders.reduce((sum, order) => sum + order.finalAmount, 0);
    const revenueInRange = ordersInRange.reduce((sum, order) => sum + order.finalAmount, 0);
    
    // Calculate monthly growth
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(startDate);
    
    const lastMonthOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= lastMonthStart && orderDate < lastMonthEnd;
    });
    
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + order.finalAmount, 0);
    const monthlyGrowth = lastMonthRevenue > 0 
      ? ((revenueInRange - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    const orderStats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      completed: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      monthlyGrowth: Math.round(monthlyGrowth * 10) / 10
    };

    // Get Cardholder Stats
    const cardholders = await Cardholder.find();
    const activeCardholders = cardholders.filter(ch => ch.cards.length > 0);
    const onlineCardholders = activeCardholders.filter(ch => ch.isOnline);
    
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    
    const newCardholdersThisMonth = cardholders.filter(ch => 
      new Date(ch.registeredAt) >= thisMonthStart
    ).length;

    const totalCards = cardholders.reduce((sum, ch) => sum + ch.cards.length, 0);

    const cardholderStats = {
      total: cardholders.length,
      active: activeCardholders.length,
      online: onlineCardholders.length,
      totalCards,
      newThisMonth: newCardholdersThisMonth
    };

    // Get Payment Request Stats
    const paymentRequests = await PaymentRequest.find();
    const paymentRequestsInRange = paymentRequests.filter(pr => 
      new Date(pr.createdAt) >= startDate
    );

    const acceptedRequests = paymentRequests.filter(pr => 
      pr.status === 'accepted' || pr.status === 'completed'
    );
    
    const totalDiscountGiven = acceptedRequests.reduce((sum, pr) => 
      sum + pr.discountAmount, 0
    );
    
    const totalCommissionEarned = acceptedRequests.reduce((sum, pr) => 
      sum + pr.commissionAmount, 0
    );

    const acceptanceRate = paymentRequests.length > 0
      ? (acceptedRequests.length / paymentRequests.length) * 100
      : 0;

    const paymentRequestStats = {
      total: paymentRequests.length,
      pending: paymentRequests.filter(pr => pr.status === 'pending').length,
      accepted: acceptedRequests.length,
      expired: paymentRequests.filter(pr => pr.status === 'expired').length,
      totalDiscountGiven,
      totalCommissionEarned,
      acceptanceRate: Math.round(acceptanceRate)
    };

    // Get Category Stats
    const categoryStats = new Map();
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const category = item.category || 'uncategorized';
        if (!categoryStats.has(category)) {
          categoryStats.set(category, { sales: 0, orders: 0 });
        }
        const stats = categoryStats.get(category);
        stats.sales += item.price * item.quantity;
        stats.orders += 1;
      });
    });

    const categories = Array.from(categoryStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.sales - a.sales);

    return res.status(200).json({
      orders: orderStats,
      cardholders: cardholderStats,
      paymentRequests: paymentRequestStats,
      categories
    });

  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default handler;