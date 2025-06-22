import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FaStar, FaArrowLeft } from 'react-icons/fa';

interface Rating {
  _id: string;
  orderId: string;
  customerEmail: string;
  cardholderName: string;
  averageRating: number;
  comment: string;
  orderAmount: number;
  discountAmount: number;
  createdAt: string;
}

const AdminRatings = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || !session.user.isAdmin) {
      router.push('/');
      return;
    }
    
    fetchRatings();
  }, [session, status]);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/ratings');
      if (response.ok) {
        const data = await response.json();
        setRatings(data.ratings || []);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            className={`text-sm ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amazon_blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || !session.user.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="text-amazon_blue hover:text-amazon_yellow">
                <FaArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center space-x-2">
                <FaStar className="h-6 w-6 text-yellow-500" />
                <h1 className="text-xl font-semibold text-gray-900">Cardholder Ratings</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amazon_blue mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading ratings...</p>
            </div>
          </div>
        ) : ratings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <FaStar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No ratings found</h3>
              <p className="text-gray-500">No ratings have been submitted yet</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cardholder
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ratings.map((rating) => (
                    <tr key={rating._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{rating.cardholderName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {renderStars(rating.averageRating)}
                          <span className="text-sm font-semibold">{rating.averageRating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>Order: {rating.orderId}</div>
                        <div className="text-gray-500">Amount: ₹{rating.orderAmount.toLocaleString()}</div>
                        <div className="text-green-600">Discount: ₹{rating.discountAmount.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rating.customerEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(rating.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRatings; 