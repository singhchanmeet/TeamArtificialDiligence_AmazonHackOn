// /api/admin/charts - Provides chart data
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import connectDb from "../../../lib/mongodb";
import Order from "@/models/Order";
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
    let groupBy = 'day';
    
    switch (range) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        groupBy = 'hour';
        break;
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        groupBy = 'day';
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        groupBy = 'day';
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        groupBy = 'week';
        break;
    }

    // Get all data
    const orders = await Order.find({
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    const paymentRequests = await PaymentRequest.find({
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    // Daily Revenue Chart
    const revenueMap = new Map();
    const dateFormat = (date: Date) => {
      if (groupBy === 'hour') {
        return `${date.getHours()}:00`;
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    };

    orders.forEach(order => {
      const dateKey = dateFormat(new Date(order.createdAt));
      if (!revenueMap.has(dateKey)) {
        revenueMap.set(dateKey, { revenue: 0, orders: 0 });
      }
      const data = revenueMap.get(dateKey);
      data.revenue += order.finalAmount;
      data.orders += 1;
    });

    const dailyRevenue = Array.from(revenueMap.entries())
      .map(([date, data]) => ({ date, ...data }));

    // Payment Request Trends
    const requestMap = new Map();
    
    paymentRequests.forEach(request => {
      const dateKey = dateFormat(new Date(request.createdAt));
      if (!requestMap.has(dateKey)) {
        requestMap.set(dateKey, { requests: 0, accepted: 0 });
      }
      const data = requestMap.get(dateKey);
      data.requests += 1;
      if (request.status === 'accepted' || request.status === 'completed') {
        data.accepted += 1;
      }
    });

    const paymentRequestTrends = Array.from(requestMap.entries())
      .map(([date, data]) => ({ date, ...data }));

    // Category Distribution
    const categoryMap = new Map();
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const category = item.category || 'uncategorized';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, 0);
        }
        categoryMap.set(category, categoryMap.get(category) + (item.price * item.quantity));
      });
    });

    const totalCategorySales = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);
    const categoryDistribution = Array.from(categoryMap.entries())
      .map(([category, value]) => ({
        category,
        value,
        percent: totalCategorySales > 0 ? value / totalCategorySales : 0
      }))
      .sort((a, b) => b.value - a.value);

    // Hourly Activity (for payment requests)
    const hourlyMap = new Map();
    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, 0);
    }

    paymentRequests.forEach(request => {
      const hour = new Date(request.createdAt).getHours();
      hourlyMap.set(hour, hourlyMap.get(hour) + 1);
    });

    const hourlyActivity = Array.from(hourlyMap.entries())
      .map(([hour, requests]) => ({
        hour: `${hour}:00`,
        requests
      }));

    return res.status(200).json({
      dailyRevenue,
      paymentRequestTrends,
      categoryDistribution,
      hourlyActivity
    });

  } catch (error) {
    console.error("Admin charts error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default handler;