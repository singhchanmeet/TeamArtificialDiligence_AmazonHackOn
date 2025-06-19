// /api/admin/orders - Lists all orders
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import connectDb from "../../../lib/mongodb";
import Order from "@/models/Order";

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

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(orders);

  } catch (error) {
    console.error("Admin orders error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default handler;