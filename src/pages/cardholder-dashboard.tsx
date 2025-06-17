import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { FaCreditCard, FaPlus, FaTrash, FaClock, FaCheckCircle } from "react-icons/fa";
import { BsLightningChargeFill } from "react-icons/bs";
import FormattedPrice from "@/components/FormattedPrice";

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
  id: string;
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
  status: 'pending' | 'accepted' | 'expired' | 'completed';
  createdAt: Date;
}

const CATEGORIES = [
  "electronics",
  "jewelery",
  "men's clothing",
  "women's clothing"
];

const CardholderDashboard = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'cards' | 'requests' | 'earnings'>('cards');
  const [showAddCard, setShowAddCard] = useState(false);
  const [registeredCards, setRegisteredCards] = useState<RegisteredCard[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [earnings, setEarnings] = useState({
    total: 0,
    thisMonth: 0,
    pending: 0
  });

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
    if (!session) {
      router.push('/signin');
      return;
    }
    // Load saved data from localStorage
    loadCardholderData();
    // Start polling for new requests
    const interval = setInterval(loadPaymentRequests, 5000);
    return () => clearInterval(interval);
  }, [session]);

  const loadCardholderData = () => {
    const savedCards = localStorage.getItem('registeredCards');
    if (savedCards) {
      setRegisteredCards(JSON.parse(savedCards));
    }
    const savedEarnings = localStorage.getItem('cardholderEarnings');
    if (savedEarnings) {
      setEarnings(JSON.parse(savedEarnings));
    }
  };

  const loadPaymentRequests = () => {
    const allRequests = localStorage.getItem('paymentRequests');
    if (allRequests) {
      const requests = JSON.parse(allRequests) as PaymentRequest[];
      // Filter requests for this cardholder's cards
      const myCardIds = registeredCards.map(card => card.id);
      const myRequests = requests.filter(req => 
        req.status === 'pending' && 
        new Date(req.expiryTime) > new Date()
      );
      setPaymentRequests(myRequests);
    }
  };

  const simulateTokenization = (cardNumber: string): string => {
    // Simulate RBI compliant tokenization
    const token = `TKN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Card tokenized:', { 
      original: cardNumber.replace(/\d(?=\d{4})/g, '*'),
      token 
    });
    return token;
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newCard.cardNumber.length !== 16) {
      alert('Please enter a valid 16-digit card number');
      return;
    }

    const tokenId = simulateTokenization(newCard.cardNumber);
    const cardData: RegisteredCard = {
      id: `CARD_${Date.now()}`,
      lastFourDigits: newCard.cardNumber.slice(-4),
      cardType: newCard.cardType,
      bankName: newCard.bankName,
      categories: newCard.categories,
      discountPercentage: newCard.discountPercentage,
      monthlyLimit: newCard.monthlyLimit,
      currentMonthSpent: 0,
      tokenId,
      isActive: true
    };

    const updatedCards = [...registeredCards, cardData];
    setRegisteredCards(updatedCards);
    localStorage.setItem('registeredCards', JSON.stringify(updatedCards));
    
    // Store cardholder info
    const cardholderInfo = {
      userId: session?.user?.email,
      cards: updatedCards,
      isOnline,
      registeredAt: new Date()
    };
    localStorage.setItem(`cardholder_${session?.user?.email}`, JSON.stringify(cardholderInfo));

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
  };

  const handleDeleteCard = (cardId: string) => {
    const updatedCards = registeredCards.filter(card => card.id !== cardId);
    setRegisteredCards(updatedCards);
    localStorage.setItem('registeredCards', JSON.stringify(updatedCards));
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
      // Update request status
      const allRequests = JSON.parse(localStorage.getItem('paymentRequests') || '[]');
      const updatedRequests = allRequests.map((req: PaymentRequest) => 
        req.id === request.id ? { ...req, status: 'accepted' } : req
      );
      localStorage.setItem('paymentRequests', JSON.stringify(updatedRequests));

      // Update earnings
      const newEarnings = {
        total: earnings.total + request.commissionAmount,
        thisMonth: earnings.thisMonth + request.commissionAmount,
        pending: earnings.pending + request.commissionAmount
      };
      setEarnings(newEarnings);
      localStorage.setItem('cardholderEarnings', JSON.stringify(newEarnings));

      alert('Payment request accepted! Commission will be credited after order completion.');
      loadPaymentRequests();
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

  if (!session) {
    return <div>Loading...</div>;
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
                  onClick={() => setIsOnline(!isOnline)}
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
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600">Total Earnings</p>
              <p className="text-2xl font-bold text-blue-800">
                <FormattedPrice amount={earnings.total} />
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">This Month</p>
              <p className="text-2xl font-bold text-green-800">
                <FormattedPrice amount={earnings.thisMonth} />
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-800">
                <FormattedPrice amount={earnings.pending} />
              </p>
            </div>
          </div>
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
                {registeredCards.map(card => (
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

              {registeredCards.length === 0 && (
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
              <h2 className="text-lg font-semibold mb-6">Live Payment Requests</h2>
              
              {paymentRequests.length > 0 ? (
                <div className="space-y-4">
                  {paymentRequests.map(request => (
                    <div key={request.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
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
                        
                        <button
                          onClick={() => handleAcceptRequest(request)}
                          className="w-full bg-amazon_yellow text-black py-2 rounded-md hover:bg-yellow-500 font-semibold transition-colors"
                        >
                          Accept & Pay
                        </button>
                      </div>
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

          {activeTab === 'earnings' && (
            <div>
              <h2 className="text-lg font-semibold mb-6">Earnings History</h2>
              <div className="text-center py-12">
                <p className="text-gray-600">Earnings history coming soon!</p>
              </div>
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
      </div>
    </div>
  );
};

export default CardholderDashboard;