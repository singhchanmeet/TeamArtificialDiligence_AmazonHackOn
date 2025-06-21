// Updated CardDiscountModal.tsx with decline handling

import React, { useState, useEffect } from "react";
import { FaCreditCard, FaClock, FaPercent, FaCheckCircle, FaArrowLeft, FaTimesCircle, FaExclamationTriangle } from "react-icons/fa";
import { BsLightningChargeFill } from "react-icons/bs";
import FormattedPrice from "./FormattedPrice";
import { StoreProduct } from "../../type";
import { useSession } from "next-auth/react";

interface CardDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: StoreProduct[];
  totalAmount: number;
  onRequestSent: (requestId: string) => void;
  orderId?: string | null;
}

interface AvailableCard {
  id: string;
  cardholderEmail: string;
  bankName: string;
  cardType: string;
  categories: string[];
  discountPercentage: number;
  isOnline: boolean;
  lastFourDigits: string;
}

interface PaymentRequestStatus {
  _id: string;
  requestId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'completed' | 'cancelled';
  discountAmount: number;
  declineReason?: string;
  declinedAt?: Date;
}

const COMMISSION_RATE = 0.05; // 5% commission for cardholders

const CardDiscountModal: React.FC<CardDiscountModalProps> = ({
  isOpen,
  onClose,
  products,
  totalAmount,
  onRequestSent,
  orderId
}) => {
  const { data: session } = useSession();
  const [step, setStep] = useState<'choose' | 'immediate' | 'scheduled' | 'confirm' | 'declined'>('choose');
  const [availableCards, setAvailableCards] = useState<AvailableCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<AvailableCard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [previousStep, setPreviousStep] = useState<'choose' | 'immediate' | 'scheduled' | null>(null);
  const [loadingReload, setLoadingReload] = useState(false);
  const [declinedRequest, setDeclinedRequest] = useState<PaymentRequestStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAvailableCards(step === 'immediate' ? 'immediate' : 'scheduled');
    }
  }, [isOpen, step, products]);

  // Check for declined requests when modal opens
  useEffect(() => {
    if (isOpen && orderId && !requestSent && !checkingStatus) {
      checkForDeclinedRequests();
    }
  }, [isOpen, orderId]);

  const checkForDeclinedRequests = async () => {
    if (!orderId) return;
    
    setCheckingStatus(true);
    try {
      const response = await fetch(`/api/payment-request/check-status?orderId=${orderId}`);
      if (response.ok) {
        const data = await response.json();
        // Check for declined requests using the updated API response
        if (data.declinedRequests?.length > 0) {
          setDeclinedRequest(data.declinedRequests[0]);
          setStep('declined');
        }
      }
    } catch (error) {
      console.error('Error checking for declined requests:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const loadAvailableCards = async (requestType: 'immediate' | 'scheduled', isManualReload = false) => {
    if (isManualReload) setLoadingReload(true);
    try {
      const categories = [...new Set(products.map(p => p.category))];
      const response = await fetch('/api/cardholder/available-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories, requestType })
      });
      if (response.ok) {
        const cards = await response.json();
        setAvailableCards(cards);
      } else {
        console.error('Failed to fetch available cards');
        setAvailableCards([]);
      }
    } catch (error) {
      console.error('Error loading available cards:', error);
      setAvailableCards([]);
    } finally {
      if (isManualReload) setLoadingReload(false);
    }
  };

  const calculateDiscountAmount = (card: AvailableCard) => {
    // Calculate discount based on matching categories
    const matchingProducts = products.filter(p => card.categories.includes(p.category));
    const matchingAmount = matchingProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    return (matchingAmount * card.discountPercentage) / 100;
  };

  const handleCardSelection = (card: AvailableCard) => {
    setSelectedCard(card);
    setPreviousStep(step as 'immediate' | 'scheduled');
    setStep('confirm');
  };

  const handleBack = () => {
    if (step === 'confirm' && previousStep) {
      setStep(previousStep);
      setSelectedCard(null);
    } else if (step === 'immediate' || step === 'scheduled') {
      setStep('choose');
    } else if (step === 'declined') {
      setStep('choose');
      setDeclinedRequest(null);
    }
  };

  const handleTryAgain = () => {
    setStep('choose');
    setDeclinedRequest(null);
  };

  const sendPaymentRequest = async (requestType: 'immediate' | 'scheduled') => {
    if (!selectedCard || !session) return;
    
    setIsLoading(true);
    
    const discountAmount = calculateDiscountAmount(selectedCard);
    const commissionAmount = discountAmount * COMMISSION_RATE;
    
    try {
      const response = await fetch('/api/payment-request/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectedCard,
          products,
          totalAmount,
          discountAmount,
          commissionAmount,
          requestType,
          orderId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRequestSent(true);
        onRequestSent(data.paymentRequest.requestId);
        
        // Close modal after 10 seconds
        setTimeout(() => {
          onClose();
          setStep('choose');
          setSelectedCard(null);
          setRequestSent(false);
          setPreviousStep(null);
          setDeclinedRequest(null);
        }, 10000);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error sending payment request:', error);
      alert('Failed to send payment request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`${step === 'declined' ? 'bg-red-600' : 'bg-amazon_blue'} text-white p-4 rounded-t-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {(step === 'immediate' || step === 'scheduled' || step === 'confirm' || step === 'declined') && !requestSent && (
                <button
                  onClick={handleBack}
                  className="text-white hover:text-gray-200 p-1 rounded hover:bg-white/20 transition-colors"
                >
                  <FaArrowLeft className="text-xl" />
                </button>
              )}
              <h2 className="text-xl font-semibold flex items-center space-x-2">
                {step === 'declined' ? <FaTimesCircle /> : <FaCreditCard />}
                <span>
                  {step === 'declined' ? 'Payment Request Declined' : 'Card Discounts Available!'}
                </span>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm mt-2 text-gray-200 ml-10">
            {step === 'declined' 
              ? 'Your previous payment request was declined by the cardholder'
              : 'Save money by using card-specific discounts through our peer-to-peer matching'
            }
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {checkingStatus && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amazon_blue mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Checking previous requests...</p>
            </div>
          )}

          {step === 'declined' && declinedRequest && !checkingStatus && (
            <div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <FaExclamationTriangle className="text-xl text-red-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800 mb-2">Request Declined</h3>
                    <p className="text-sm text-red-700 mb-3">
                      The cardholder was unable to process your payment request. You can try with a different card or continue with regular payment methods.
                    </p>
                    
                    {declinedRequest.declineReason && (
                      <div className="bg-red-100 rounded p-3 mb-3">
                        <p className="text-sm text-red-800">
                          <strong>Reason provided:</strong> {declinedRequest.declineReason}
                        </p>
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-600">
                      <p><strong>Declined Amount:</strong> <FormattedPrice amount={declinedRequest.discountAmount} /></p>
                      {declinedRequest.declinedAt && (
                        <p><strong>Declined At:</strong> {new Date(declinedRequest.declinedAt).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleTryAgain}
                  className="flex-1 bg-amazon_blue text-white py-3 rounded-md hover:bg-blue-700 font-semibold"
                >
                  Try Another Card
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-md hover:bg-gray-300 font-semibold"
                >
                  Continue Without Discount
                </button>
              </div>
            </div>
          )}

          {step === 'choose' && !checkingStatus && (
            <div>
              <h3 className="text-lg font-semibold mb-4">How would you like to proceed?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setStep('immediate')}
                  className="border-2 border-gray-200 rounded-lg p-6 hover:border-amazon_blue hover:shadow-lg transition-all text-left"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <BsLightningChargeFill className="text-3xl text-yellow-500" />
                    <h4 className="font-semibold text-lg">Find Available Card Now</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Connect instantly with online cardholders for immediate payment processing
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Faster processing • ✓ Real-time matching
                  </p>
                </button>
                
                <button
                  onClick={() => setStep('scheduled')}
                  className="border-2 border-gray-200 rounded-lg p-6 hover:border-amazon_blue hover:shadow-lg transition-all text-left"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <FaClock className="text-3xl text-blue-500" />
                    <h4 className="font-semibold text-lg">Submit Request for Later</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Your request will be sent to all active cardholders for flexible processing
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    ✓ More options • ✓ 30 min validity
                  </p>
                </button>
              </div>
            </div>
          )}

          {(step === 'immediate' || step === 'scheduled') && !requestSent && !checkingStatus && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                {step === 'immediate' ? 'Available Cards (Online Now)' : 'All Available Cards'}
              </h3>

              <button
                onClick={() => loadAvailableCards(step, true)}
                className="text-sm text-amazon_blue hover:underline flex items-center space-x-1 mb-4"
                disabled={loadingReload}
              >
                {loadingReload ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-amazon_blue" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Reloading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5 9a9 9 0 0114.5-5.5M19 15a9 9 0 01-14.5 5.5" />
                    </svg>
                    <span>Reload</span>
                  </>
                )}
              </button>
              
              {availableCards.length > 0 ? (
                <div className="space-y-3">
                  {availableCards
                    .filter(card => step === 'scheduled' || card.isOnline)
                    .slice(0, 5)
                    .map(card => {
                      const discountAmount = calculateDiscountAmount(card);
                      const savings = discountAmount - (discountAmount * COMMISSION_RATE);
                      
                      return (
                        <div
                          key={card.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleCardSelection(card)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                              <FaCreditCard className="text-2xl text-gray-600" />
                              <div>
                                <p className="font-semibold">{card.bankName}</p>
                                <p className="text-sm text-gray-600">
                                  •••• {card.lastFourDigits} ({card.cardType})
                                  {card.isOnline && (
                                    <span className="ml-2 text-green-600">● Online</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="flex items-center space-x-1 text-green-600 font-semibold">
                                <FaPercent className="text-sm" />
                                <span>{card.discountPercentage}% OFF</span>
                              </div>
                              <p className="text-sm text-gray-600">
                                Save <FormattedPrice amount={savings} />
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              Categories: {card.categories.join(', ')}
                            </span>
                            <button className="text-amazon_blue hover:underline">
                              Select →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FaCreditCard className="text-5xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No cards available at the moment</p>
                  <p className="text-sm text-gray-500 mt-2">Please try again later</p>
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && selectedCard && !requestSent && !checkingStatus && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Confirm Payment Request</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-semibold mb-2">Selected Card:</p>
                <div className="flex items-center space-x-3">
                  <FaCreditCard className="text-xl text-gray-600" />
                  <div>
                    <p className="font-medium">{selectedCard.bankName}</p>
                    <p className="text-sm text-gray-600">
                      •••• {selectedCard.lastFourDigits} • {selectedCard.discountPercentage}% discount
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex justify-between">
                  <span>Order Amount:</span>
                  <span><FormattedPrice amount={totalAmount} /></span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Card Discount:</span>
                  <span>-<FormattedPrice amount={calculateDiscountAmount(selectedCard)} /></span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Service Fee (5%):</span>
                  <span><FormattedPrice amount={calculateDiscountAmount(selectedCard) * COMMISSION_RATE} /></span>
                </div>
                <hr />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Your Total Savings:</span>
                  <span className="text-green-600">
                    <FormattedPrice amount={calculateDiscountAmount(selectedCard) - (calculateDiscountAmount(selectedCard) * COMMISSION_RATE)} />
                  </span>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>How it works:</strong> You'll pay the full order amount to Amazon now. 
                  The cardholder will complete the payment using their card, and you'll receive 
                  the discount amount back after verification.
                </p>
              </div>
              
              <button
                onClick={() => sendPaymentRequest(previousStep as 'immediate' | 'scheduled')}
                disabled={isLoading}
                className="w-full bg-amazon_yellow text-black py-3 rounded-md hover:bg-yellow-500 font-semibold disabled:opacity-50"
              >
                {isLoading ? 'Sending Request...' : 'Confirm & Send Request'}
              </button>

              <p className="text-xs text-gray-500 text-center mt-2">
                The total amount will be automatically debited from your Amazon Pay balance upon confirmation.
              </p>
            </div>
          )}

          {requestSent && !checkingStatus && (
            <div className="text-center py-8">
              <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Request Sent Successfully!</h3>
              <p className="text-gray-600 mb-4">
                The cardholder has been notified. You'll receive a confirmation once they accept.
              </p>
              <p className="text-sm text-gray-500">
                This window will close automatically...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardDiscountModal;