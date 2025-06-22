import React, { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  FaSearch, 
  FaFilter, 
  FaEye, 
  FaTruck, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock,
  FaBox,
  FaArrowLeft,
  FaShoppingBag
} from 'react-icons/fa';
import FormattedPrice from '@/components/FormattedPrice';

interface OrderItem {
  id: number;
  title: string;
  price: number;
  category: string;
  image: string;
  quantity: number;
}

interface DeliveryAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone?: string;
}

interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  details?: string;
}

interface Order {
  _id: string;
  orderId: string;
  userEmail: string;
  items: OrderItem[];
  deliveryAddress: DeliveryAddress;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  deliveryCharges: number;
  promotionDiscount: number;
  cardDiscount: number;
  finalAmount: number;
  cardDiscountRequestId?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

const OrdersPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      signIn();
      return;
    }
    
    fetchOrders();
  }, [session, status]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/order/list');
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <FaClock className="text-yellow-500" />;
      case 'processing':
        return <FaBox className="text-blue-500" />;
      case 'shipped':
        return <FaTruck className="text-purple-500" />;
      case 'delivered':
        return <FaCheckCircle className="text-green-500" />;
      case 'cancelled':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaClock className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.items.some(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
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

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-amazon_blue hover:text-amazon_yellow">
                <FaArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center space-x-2">
                <FaShoppingBag className="h-6 w-6 text-amazon_blue" />
                <h1 className="text-xl font-semibold text-gray-900">My Orders</h1>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {orders.length} order{orders.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders by order ID or product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amazon_blue focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <FaFilter className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amazon_blue focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amazon_blue mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading orders...</p>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <FaShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'You haven\'t placed any orders yet'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 bg-amazon_blue text-white rounded-md hover:bg-amazon_yellow hover:text-black transition-colors"
                >
                  Start Shopping
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm border">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(order.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Order ID</p>
                          <p className="font-medium">{order.orderId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Items</p>
                          <p className="font-medium">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total Amount</p>
                          <p className="font-medium"><FormattedPrice amount={order.totalAmount} /></p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Final Amount</p>
                          <p className="font-medium text-green-600"><FormattedPrice amount={order.finalAmount} /></p>
                        </div>
                      </div>

                      {/* Order Items Preview */}
                      <div className="flex space-x-2 overflow-x-auto pb-2">
                        {order.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex-shrink-0 w-16 h-16 border rounded-md overflow-hidden">
                            <img 
                              src={item.image} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="flex-shrink-0 w-16 h-16 border rounded-md bg-gray-100 flex items-center justify-center">
                            <span className="text-xs text-gray-500">+{order.items.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 lg:mt-0 lg:ml-6">
                      <button
                        onClick={() => viewOrderDetails(order)}
                        className="flex items-center space-x-2 px-4 py-2 bg-amazon_blue text-white rounded-md hover:bg-amazon_yellow hover:text-black transition-colors"
                      >
                        <FaEye className="h-4 w-4" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Order Details</h2>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimesCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Order Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Order Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500">Order ID:</span> {selectedOrder.orderId}</p>
                    <p><span className="text-gray-500">Date:</span> {formatDate(selectedOrder.createdAt)}</p>
                    <p><span className="text-gray-500">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusText(selectedOrder.status)}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Payment Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500">Method:</span> {selectedOrder.paymentMethod.name}</p>
                    <p><span className="text-gray-500">Total Amount:</span> <FormattedPrice amount={selectedOrder.totalAmount} /></p>
                    {selectedOrder.promotionDiscount > 0 && (
                      <p><span className="text-gray-500">Promotion Discount:</span> -<FormattedPrice amount={selectedOrder.promotionDiscount} /></p>
                    )}
                    {selectedOrder.cardDiscount > 0 && (
                      <p><span className="text-gray-500">Card Discount:</span> -<FormattedPrice amount={selectedOrder.cardDiscount} /></p>
                    )}
                    <p><span className="text-gray-500">Final Amount:</span> <span className="font-medium text-green-600"><FormattedPrice amount={selectedOrder.finalAmount} /></span></p>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-2">Delivery Address</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="font-medium">{selectedOrder.deliveryAddress.name}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.deliveryAddress.addressLine1}</p>
                  {selectedOrder.deliveryAddress.addressLine2 && (
                    <p className="text-sm text-gray-600">{selectedOrder.deliveryAddress.addressLine2}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    {selectedOrder.deliveryAddress.city}, {selectedOrder.deliveryAddress.state} {selectedOrder.deliveryAddress.pincode}
                  </p>
                  <p className="text-sm text-gray-600">{selectedOrder.deliveryAddress.country}</p>
                  {selectedOrder.deliveryAddress.phone && (
                    <p className="text-sm text-gray-600">Phone: {selectedOrder.deliveryAddress.phone}</p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Order Items</h3>
                <div className="space-y-4">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex space-x-4 border-b pb-4">
                      <img 
                        src={item.image} 
                        alt={item.title}
                        className="w-20 h-20 object-contain border rounded-md"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        <p className="text-sm text-gray-600">Category: {item.category}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        <p className="font-semibold text-sm">
                          <FormattedPrice amount={item.price * item.quantity} />
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage; 