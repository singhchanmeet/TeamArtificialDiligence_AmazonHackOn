// /utils/expireOldRequests.ts - Utility to expire old payment requests
// will be called before each api call to all /api/cardholder routes to expire old payment requests
// TODO: Implement an actual cron job using Vercel Cron or similar service
// to run this periodically instead of on every request
import dbConnect from '../lib/mongodb';
import PaymentRequest from '../models/PaymentRequest';

export const expireOldRequests = async () => {
  await dbConnect();

  const result = await PaymentRequest.updateMany(
    {
      status: 'pending',
      expiryTime: { $lt: new Date() }
    },
    {
      $set: { status: 'expired' }
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`[Expire Hook] Marked ${result.modifiedCount} requests as expired`);
  }
};
