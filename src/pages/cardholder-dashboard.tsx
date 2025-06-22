import React, { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { FaCreditCard, FaPlus, FaTrash, FaClock, FaCheckCircle, FaTimesCircle, FaHistory, FaChartLine } from "react-icons/fa";
import { BsLightningChargeFill } from "react-icons/bs";
import FormattedPrice from "@/components/FormattedPrice";
import TrustScoreDisplay from '@/components/TrustScoreDisplay';

interface RegisteredCard {
  id: string;
  lastFourDigits: string;
  cardType: string;
  bankName: string;
  categories: string[];
  discountPercentage: number;
  monthlyLimit: number;
  currentMonthSpent: number;
  tokenId: string;
  isActive: boolean;
}

interface PaymentRequest {
  _id: string;
  requestId: string;
  orderId: string;
  userId: string;
  userName: string;
  productDetails: {
    title: string;
    category: string;
    quantity: number;
  }[];
  orderAmount: number;
  discountAmount: number;
  commissionAmount: number;
  totalPayable: number;
  expiryTime: Date;
  status: string;
  declineReason?: string;
  createdAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  completedAt?: Date;
  trustReport?: any;
}

interface CardholderData {
  _id: string;
  userId: string;
  name: string;
  cards: RegisteredCard[];
  isOnline: boolean;
  earnings: {
    total: number;
    thisMonth: number;
    pending: number;
  };
}

const CATEGORIES = [
  "electronics",
  "jewelery",
  "men's clothing",
  "women's clothing"
];

const CardholderDashboard = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'cards' | 'requests' | 'earnings'>('cards');
  const [requestsSubTab, setRequestsSubTab] = useState<'live' | 'expired'>('live');
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardholderData, setCardholderData] = useState<CardholderData | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [expiredRequests, setExpiredRequests] = useState<PaymentRequest[]>([]);
  const [earningsHistory, setEarningsHistory] = useState<PaymentRequest[]>([]);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedRequestForDecline, setSelectedRequestForDecline] = useState<PaymentRequest | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  // New card form state
  const [newCard, setNewCard] = useState({
    cardNumber: '',
    cardType: 'credit',
    bankName: '',
    categories: [] as string[],
    discountPercentage: 5,
    monthlyLimit: 50000
  });

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      signIn();
      return;
    }
    
    fetchCardholderData();
    fetchAllRequests();
  }, [session, status]);

  useEffect(() => {
    if (cardholderData) {
      // Start polling for new requests every 5 seconds
      const interval = setInterval(() => {
        fetchPaymentRequests();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [cardholderData]);

  // polling for online/offline status - starts after cardholderData is fetched
  useEffect(() => {
    if (!cardholderData) return;

    const interval = setInterval(() => {
      navigator.onLine && fetch('/api/cardholder/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    }, 15000); // every 15 seconds

    return () => clearInterval(interval);
  }, [cardholderData]);

  const fetchCardholderData = async () => {
    try {
      const response = await fetch('/api/cardholder/profile');
      if (response.ok) {
        const data = await response.json();
        setCardholderData(data);
        setIsOnline(data.isOnline);
      } else if (response.status === 404) {
        // User is not a cardholder yet
        setCardholderData(null);
      }
    } catch (error) {
      console.error('Error fetching cardholder data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentRequests = async () => {
    try {
      const response = await fetch('/api/payment-request/list?role=cardholder');
      if (response.ok) {
        const data = await response.json();
        setPaymentRequests(data);
      }
    } catch (error) {
      console.error('Error fetching payment requests:', error);
    }
  };

  const fetchAllRequests = async () => {
    try {
      // Fetch live requests
      await fetchPaymentRequests();
      
      // Fetch expired requests
      const expiredResponse = await fetch('/api/payment-request/expired?role=cardholder');
      if (expiredResponse.ok) {
        const expiredData = await expiredResponse.json();
        setExpiredRequests(expiredData);
      }
      
      // Fetch earnings history (completed requests)
      const historyResponse = await fetch('/api/payment-request/history?role=cardholder');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setEarningsHistory(historyData);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newCard.cardNumber.length !== 16) {
      alert('Please enter a valid 16-digit card number');
      return;
    }

    try {
      const response = await fetch('/api/cardholder/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ card: newCard })
      });

      if (response.ok) {
        const data = await response.json();
        setCardholderData(data.cardholder);
        
        // Reset form
        setNewCard({
          cardNumber: '',
          cardType: 'credit',
          bankName: '',
          categories: [],
          discountPercentage: 5,
          monthlyLimit: 50000
        });
        setShowAddCard(false);
        alert('Card registered successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding card:', error);
      alert('Failed to add card. Please try again.');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;

    try {
      const response = await fetch('/api/cardholder/delete-card', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cardId })
      });

      if (response.ok) {
        const data = await response.json();
        setCardholderData(data.cardholder);
        alert('Card deleted successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Failed to delete card. Please try again.');
    }
  };

  const handleOnlineToggle = async () => {
    try {
      const response = await fetch('/api/cardholder/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isOnline: !isOnline })
      });

      if (response.ok) {
        const data = await response.json();
        setCardholderData(data);
        setIsOnline(!isOnline);
      }
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setNewCard(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleAcceptRequest = async (request: PaymentRequest) => {
    // Simulate payment processing
    const confirmed = confirm(`Accept payment request for ₹${request.totalPayable}?\n\nYou will earn ₹${request.commissionAmount} commission.`);
    
    if (confirmed) {
      try {
        const response = await fetch('/api/payment-request/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ requestId: request.requestId })
        });

        if (response.ok) {
          alert('Payment request accepted! Commission will be credited after order completion.');
          fetchAllRequests();
          fetchCardholderData();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error}`);
        }
      } catch (error) {
        console.error('Error accepting request:', error);
        alert('Failed to accept request. Please try again.');
      }
    }
  };

  const handleDeclineRequest = async (request: PaymentRequest) => {
    setSelectedRequestForDecline(request);
    setShowDeclineModal(true);
  };

  const confirmDeclineRequest = async () => {
    if (!selectedRequestForDecline) return;
    
    try {
      const response = await fetch('/api/payment-request/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          requestId: selectedRequestForDecline.requestId,
          reason: declineReason 
        })
      });

      if (response.ok) {
        alert('Payment request declined successfully.');
        fetchAllRequests();
        setShowDeclineModal(false);
        setSelectedRequestForDecline(null);
        setDeclineReason('');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error declining request:', error);
      alert('Failed to decline request. Please try again.');
    }
  };

  const getTimeRemaining = (expiryTime: Date) => {
    const now = new Date();
    const expiry = new Date(expiryTime);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      declined: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
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

  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amazon_blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Cardholder Dashboard</h1>
              <p className="text-gray-600 mt-1">Earn commissions by helping others save!</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Status:</span>
                <button
                  onClick={handleOnlineToggle}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    isOnline 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isOnline ? '🟢 Online' : '⚫ Offline'}
                </button>
              </div>
            </div>
          </div>

          {/* Earnings Summary */}
          {cardholderData && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600">Total Earnings</p>
                <p className="text-2xl font-bold text-blue-800">
                  <FormattedPrice amount={cardholderData.earnings.total} />
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600">This Month</p>
                <p className="text-2xl font-bold text-green-800">
                  <FormattedPrice amount={cardholderData.earnings.thisMonth} />
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-800">
                  <FormattedPrice amount={cardholderData.earnings.pending} />
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex-1 py-3 px-4 font-medium transition-colors ${
                activeTab === 'cards'
                  ? 'text-amazon_blue border-b-2 border-amazon_blue'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              My Cards
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-3 px-4 font-medium transition-colors relative ${
                activeTab === 'requests'
                  ? 'text-amazon_blue border-b-2 border-amazon_blue'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Payment Requests
              {paymentRequests.length > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {paymentRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('earnings')}
              className={`flex-1 py-3 px-4 font-medium transition-colors ${
                activeTab === 'earnings'
                  ? 'text-amazon_blue border-b-2 border-amazon_blue'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Earnings History
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'cards' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Registered Cards</h2>
                <button
                  onClick={() => setShowAddCard(true)}
                  className="flex items-center space-x-2 bg-amazon_blue text-white px-4 py-2 rounded-md hover:bg-amazon_yellow hover:text-black transition-colors"
                >
                  <FaPlus />
                  <span>Add Card</span>
                </button>
              </div>

              {/* Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cardholderData?.cards.map(card => (
                  <div key={card.id} className="border rounded-lg p-4 relative">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <FaCreditCard className="text-2xl text-gray-600" />
                        <div>
                          <p className="font-semibold">{card.bankName}</p>
                          <p className="text-sm text-gray-600">
                            •••• {card.lastFourDigits} ({card.cardType})
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">Categories:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {card.categories.map(cat => (
                            <span key={cat} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-green-600">{card.discountPercentage}%</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Monthly Limit:</span>
                        <span className="font-medium">
                          <FormattedPrice amount={card.monthlyLimit} />
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Used this month:</span>
                        <span className="font-medium">
                          <FormattedPrice amount={card.currentMonthSpent} />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {(!cardholderData || cardholderData.cards.length === 0) && (
                <div className="text-center py-12">
                  <FaCreditCard className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No cards registered yet</p>
                  <p className="text-sm text-gray-500 mt-2">Add your first card to start earning commissions!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div>
              {/* Sub-tabs for Live and Expired requests */}
              <div className="flex space-x-4 mb-6 border-b">
                <button
                  onClick={() => setRequestsSubTab('live')}
                  className={`pb-2 px-1 font-medium text-sm transition-colors ${
                    requestsSubTab === 'live'
                      ? 'text-amazon_blue border-b-2 border-amazon_blue'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Live Requests ({paymentRequests.length})
                </button>
                <button
                  onClick={() => setRequestsSubTab('expired')}
                  className={`pb-2 px-1 font-medium text-sm transition-colors ${
                    requestsSubTab === 'expired'
                      ? 'text-amazon_blue border-b-2 border-amazon_blue'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Expired & Declined ({expiredRequests.length})
                </button>
              </div>

              {requestsSubTab === 'live' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Live Payment Requests</h2>
                  
                  {paymentRequests.length > 0 ? (
                    <div className="space-y-4">
                      {paymentRequests.map(request => (
                        <div key={request._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <BsLightningChargeFill className="text-yellow-500" />
                                <span className="font-semibold">Order #{request.orderId}</span>
                                <span className="text-sm text-gray-600">by {request.userName}</span>
                              </div>
                              
                              <div className="space-y-1">
                                {request.productDetails.map((product, idx) => (
                                  <p key={idx} className="text-sm text-gray-700">
                                    • {product.title} ({product.category}) x{product.quantity}
                                  </p>
                                ))}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="flex items-center space-x-1 text-sm text-red-600 mb-2">
                                <FaClock />
                                <span>{getTimeRemaining(request.expiryTime)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t pt-3 mt-3">
                            <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                              <div>
                                <p className="text-gray-600">Order Amount</p>
                                <p className="font-medium">
                                  <FormattedPrice amount={request.orderAmount} />
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Discount</p>
                                <p className="font-medium text-green-600">
                                  -<FormattedPrice amount={request.discountAmount} />
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Your Commission</p>
                                <p className="font-medium text-blue-600">
                                  +<FormattedPrice amount={request.commissionAmount} />
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">You Pay</p>
                                <p className="font-semibold text-lg">
                                  <FormattedPrice amount={request.totalPayable} />
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleDeclineRequest(request)}
                                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 font-medium transition-colors"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => handleAcceptRequest(request)}
                                className="flex-1 bg-amazon_yellow text-black py-2 rounded-md hover:bg-yellow-500 font-semibold transition-colors"
                              >
                                Accept & Pay
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 text-center mt-2">
                              The total amount will be automatically debited from your registered card upon confirmation.
                            </p>
                          </div>
                          {/* Trust Report UI */}
                          {request.trustReport && (
                            <TrustScoreDisplay 
                              trustReport={request.trustReport} 
                              isCompact={false} 
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BsLightningChargeFill className="text-6xl text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No active payment requests</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {isOnline ? 'Waiting for new requests...' : 'Go online to receive requests'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {requestsSubTab === 'expired' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Expired & Declined Requests</h2>
                  
                  {expiredRequests.length > 0 ? (
                    <div className="space-y-4">
                      {expiredRequests.map(request => (
                        <div key={request._id} className="border rounded-lg p-4 opacity-75">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                {request.status === 'declined' ? (
                                  <FaTimesCircle className="text-red-500" />
                                ) : (
                                  <FaTimesCircle className="text-gray-500" />
                                )}
                                <span className="font-semibold">Order #{request.orderId}</span>
                                <span className="text-sm text-gray-600">by {request.userName}</span>
                                {getStatusBadge(request.status)}
                              </div>
                              
                              <div className="space-y-1">
                                {request.productDetails.map((product, idx) => (
                                  <p key={idx} className="text-sm text-gray-700">
                                    • {product.title} ({product.category}) x{product.quantity}
                                  </p>
                                ))}
                              </div>
                              
                              {/* Show decline reason if available */}
                              {request.status === 'declined' && request.declineReason && (
                                <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                                  <p className="text-red-700">
                                    <strong>Decline reason:</strong> {request.declineReason}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <p className="text-sm text-gray-600">
                                {request.status === 'declined' ? 'Declined on' : 'Expired on'}
                              </p>
                              <p className="text-sm font-medium">
                                {formatDate(request.declinedAt || request.expiryTime)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="border-t pt-3 mt-3">
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Order Amount</p>
                                <p className="font-medium">
                                  <FormattedPrice amount={request.orderAmount} />
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Discount</p>
                                <p className="font-medium text-gray-600">
                                  <FormattedPrice amount={request.discountAmount} />
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">
                                  {request.status === 'declined' ? 'Declined Commission' : 'Lost Commission'}
                                </p>
                                <p className="font-medium text-red-600">
                                  <FormattedPrice amount={request.commissionAmount} />
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Request Value</p>
                                <p className="font-semibold">
                                  <FormattedPrice amount={request.totalPayable} />
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FaTimesCircle className="text-6xl text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No expired or declined requests</p>
                      <p className="text-sm text-gray-500 mt-2">Great job responding to requests on time!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'earnings' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center space-x-2">
                  <FaChartLine />
                  <span>Earnings History</span>
                </h2>
                <div className="text-sm text-gray-600">
                  Total transactions: {earningsHistory.length}
                </div>
              </div>
              
              {earningsHistory.length > 0 ? (
                <div className="space-y-4">
                  {earningsHistory.map(transaction => (
                    <div key={transaction._id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <FaCheckCircle className="text-green-500" />
                            <span className="font-semibold">Order #{transaction.orderId}</span>
                            {getStatusBadge(transaction.status)}
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-700">
                            <p>Customer: {transaction.userName}</p>
                            <p>Products: {transaction.productDetails.length} items</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {transaction.status === 'completed' ? 'Completed on' : 'Accepted on'}
                          </p>
                          <p className="text-sm font-medium">
                            {formatDate(transaction.completedAt || transaction.acceptedAt || transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3 mt-3">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Order Value</p>
                            <p className="font-medium">
                              <FormattedPrice amount={transaction.orderAmount} />
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Discount Given</p>
                            <p className="font-medium">
                              <FormattedPrice amount={transaction.discountAmount} />
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Amount Paid</p>
                            <p className="font-medium">
                              <FormattedPrice amount={transaction.totalPayable} />
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Commission Earned</p>
                            <p className="font-semibold text-green-600 text-lg">
                              +<FormattedPrice amount={transaction.commissionAmount} />
                            </p>
                          </div>
                       </div>
                       
                       {transaction.status === 'accepted' && (
                         <div className="mt-3 p-2 bg-yellow-50 rounded text-sm text-yellow-800">
                           <p className="flex items-center space-x-1">
                             <FaClock className="text-xs" />
                             <span>Commission pending - will be credited after order completion</span>
                           </p>
                         </div>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-center py-12">
                 <FaHistory className="text-6xl text-gray-300 mx-auto mb-4" />
                 <p className="text-gray-600">No earnings history yet</p>
                 <p className="text-sm text-gray-500 mt-2">
                   Start accepting payment requests to build your earnings history!
                 </p>
               </div>
             )}
           </div>
         )}
       </div>

       {/* Add Card Modal */}
       {showAddCard && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
             <h3 className="text-xl font-semibold mb-4">Add New Card</h3>
             
             <form onSubmit={handleAddCard}>
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Card Number
                   </label>
                   <input
                     type="text"
                     value={newCard.cardNumber}
                     onChange={(e) => setNewCard({...newCard, cardNumber: e.target.value.replace(/\D/g, '')})}
                     maxLength={16}
                     placeholder="1234 5678 9012 3456"
                     className="w-full px-3 py-2 border rounded-md"
                     required
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Bank Name
                   </label>
                   <input
                     type="text"
                     value={newCard.bankName}
                     onChange={(e) => setNewCard({...newCard, bankName: e.target.value})}
                     placeholder="e.g., HDFC Bank"
                     className="w-full px-3 py-2 border rounded-md"
                     required
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Card Type
                   </label>
                   <select
                     value={newCard.cardType}
                     onChange={(e) => setNewCard({...newCard, cardType: e.target.value})}
                     className="w-full px-3 py-2 border rounded-md"
                   >
                     <option value="credit">Credit Card</option>
                     <option value="debit">Debit Card</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Categories (Select all that apply)
                   </label>
                   <div className="space-y-2">
                     {CATEGORIES.map(category => (
                       <label key={category} className="flex items-center space-x-2">
                         <input
                           type="checkbox"
                           checked={newCard.categories.includes(category)}
                           onChange={() => handleCategoryToggle(category)}
                           className="rounded text-amazon_blue"
                         />
                         <span className="text-sm capitalize">{category}</span>
                       </label>
                     ))}
                   </div>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Discount Percentage
                   </label>
                   <input
                     type="number"
                     value={newCard.discountPercentage}
                     onChange={(e) => setNewCard({...newCard, discountPercentage: Number(e.target.value)})}
                     min="1"
                     max="50"
                     className="w-full px-3 py-2 border rounded-md"
                     required
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Monthly Spending Limit (₹)
                   </label>
                   <input
                     type="number"
                     value={newCard.monthlyLimit}
                     onChange={(e) => setNewCard({...newCard, monthlyLimit: Number(e.target.value)})}
                     min="1000"
                     className="w-full px-3 py-2 border rounded-md"
                     required
                   />
                 </div>
               </div>
               
               <div className="flex space-x-3 mt-6">
                 <button
                   type="button"
                   onClick={() => setShowAddCard(false)}
                   className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   className="flex-1 px-4 py-2 bg-amazon_blue text-white rounded-md hover:bg-amazon_yellow hover:text-black"
                 >
                   Add Card
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

       {/* Decline Modal */}
        {showDeclineModal && selectedRequestForDecline && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Decline Payment Request</h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Order #{selectedRequestForDecline.orderId} by {selectedRequestForDecline.userName}
                </p>
                <p className="text-sm text-gray-600">
                  Amount: <FormattedPrice amount={selectedRequestForDecline.totalPayable} />
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for declining (optional)
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g., Insufficient funds, Card limit exceeded, etc."
                  className="w-full px-3 py-2 border rounded-md resize-none"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">{declineReason.length}/200 characters</p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeclineModal(false);
                    setSelectedRequestForDecline(null);
                    setDeclineReason('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeclineRequest}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  Decline Request
                </button>
              </div>
            </div>
          </div>
        )}
     </div>
   </div>
 );
};

export default CardholderDashboard;