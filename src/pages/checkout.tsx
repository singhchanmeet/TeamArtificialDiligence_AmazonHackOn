import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { StoreProduct, stateProps } from "../../type";
import FormattedPrice from "@/components/FormattedPrice";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FaLock, FaChevronDown, FaEdit, FaCreditCard, FaPercent } from "react-icons/fa";
import { BsCheckCircleFill } from "react-icons/bs";
import CardDiscountModal from "@/components/CardDiscountModal";
import { resetCart } from "@/store/nextSlice";

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
  type: 'card' | 'upi' | 'netbanking' | 'cod' | 'emi';
  name: string;
  details?: string;
  logo?: string;
}

const CheckoutPage = () => {
  const { productData, userInfo } = useSelector((state: stateProps) => state.next);
  const { data: session, status } = useSession();
  const router = useRouter();
  const dispatch = useDispatch();
  
  const [totalAmount, setTotalAmount] = useState(0);
  const [deliveryCharges, setDeliveryCharges] = useState(0);
  const [promotionDiscount, setPromotionDiscount] = useState(59);
  const [cardDiscount, setCardDiscount] = useState(0);
  const [step, setStep] = useState(1); // 1: Address, 2: Payment, 3: Review
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [showCardDiscountModal, setShowCardDiscountModal] = useState(false);
  const [activeCardRequest, setActiveCardRequest] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [checkingCardStatus, setCheckingCardStatus] = useState(false);
  const [waitingForPaymentRequest, setWaitingForPaymentRequest] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [hasPlacedOrder, setHasPlacedOrder] = useState(false);
  
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    name: userInfo?.name || "",
    addressLine1: "",
    addressLine2: "",
    city: "New Delhi",
    state: "Delhi",
    pincode: "",
    country: "India",
    phone: ""
  });

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'axis_debit',
      type: 'card',
      name: 'Axis Bank Debit Card',
      details: 'ending in 8191',
      logo: 'rupay'
    },
    {
      id: 'credit_debit',
      type: 'card',
      name: 'Credit or debit card',
      details: 'Visa, Mastercard, American Express & more'
    },
    {
      id: 'net_banking',
      type: 'netbanking',
      name: 'Net Banking',
      details: 'Choose from 40+ banks'
    },
    {
      id: 'other_upi',
      type: 'upi',
      name: 'Other UPI Apps',
      details: 'PhonePe, Paytm, Google Pay & more'
    },
    {
      id: 'emi',
      type: 'emi',
      name: 'EMI',
      details: 'No Cost EMI available'
    },
    {
      id: 'cod',
      type: 'cod',
      name: 'Cash on Delivery/Pay on Delivery',
      details: 'Cash, UPI and Cards accepted'
    }
  ];

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || !userInfo) {
      signIn();
      return;
    }

    if (productData.length === 0) {
      router.push('/cart');
      return;
    }

    let amount = 0;
    productData.forEach((item: StoreProduct) => {
      amount += item.price * item.quantity;
    });
    setTotalAmount(amount);
    
    // Set delivery charges based on total amount
    setDeliveryCharges(amount > 500 ? 0 : 59);
    
    // Generate a unique order ID when checkout page loads
    if (!currentOrderId) {
      const orderId = `AMZ-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      setCurrentOrderId(orderId);
    }
  }, [productData, session, userInfo, router, status, currentOrderId]);

  // Poll for card request acceptance - now based on waitingForPaymentRequest
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (waitingForPaymentRequest && currentOrderId && !checkingCardStatus) {
      setCheckingCardStatus(true);
      console.log('Starting to poll for order:', currentOrderId);
      
      interval = setInterval(async () => {
        try {
          console.log('Polling for order:', currentOrderId);
          const response = await fetch(`/api/payment-request/check-status?orderId=${currentOrderId}`);
          if (response.ok) {
            const data = await response.json();
            console.log('Poll response:', data);
            
            if (data.acceptedRequest) {
              console.log('Card request accepted!', data.acceptedRequest);
              // Card request accepted - proceed with order
              setActiveCardRequest(data.acceptedRequest.requestId);
              setCardDiscount(data.acceptedRequest.discountAmount);
              setWaitingForPaymentRequest(false); // Stop polling
              setShowCardDiscountModal(false); // Close modal if still open
              
              // Create order immediately
              handleAutoPlaceOrder(data.acceptedRequest);
            }
          }
        } catch (error) {
          console.error('Error checking card requests:', error);
        }
      }, 2000); // Check every 2 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
        setCheckingCardStatus(false);
      }
    };
  }, [waitingForPaymentRequest, currentOrderId]);

  // Timeout for payment request
  useEffect(() => {
    if (waitingForPaymentRequest) {
      // Stop polling after 5 minutes (or whatever the request expiry time is)
      const timeout = setTimeout(() => {
        setWaitingForPaymentRequest(false);
        setActiveRequestId(null);
        alert('Payment request expired. Please try again.');
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearTimeout(timeout);
    }
  }, [waitingForPaymentRequest]);

  const handleAutoPlaceOrder = async (acceptedRequest: any) => {
    setIsProcessing(true);
    
    try {
      // Use default payment method for card discount orders
      const defaultPaymentMethod = {
        id: 'card_discount',
        type: 'card' as const,
        name: 'Card Discount Payment',
        details: `Payment via ${acceptedRequest.cardDetails || 'Cardholder'}`
      };
      
      const orderData = {
        items: productData,
        deliveryAddress: deliveryAddress.addressLine1 ? deliveryAddress : {
          ...deliveryAddress,
          name: userInfo?.name || "Customer",
          addressLine1: "Default Address",
          city: "New Delhi",
          state: "Delhi",
          pincode: "110001",
          country: "India"
        },
        paymentMethod: defaultPaymentMethod,
        totalAmount,
        deliveryCharges,
        promotionDiscount,
        cardDiscount: acceptedRequest.discountAmount,
        cardDiscountRequestId: acceptedRequest.requestId,
        orderId: currentOrderId
      };
      
      const response = await fetch('/api/order/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const data = await response.json();
        setHasPlacedOrder(true); // ✅ Block any further redirect

        // Clear cart
        dispatch(resetCart());
        
        // Redirect to success page
        router.push(`/order-success?orderId=${data.order.orderId}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Error placing order. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingAddress(false);
    setStep(2);
  };

  const handlePaymentSelection = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setStep(3);
  };

  const handlePlaceOrder = async () => {
    if (!selectedPaymentMethod || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const orderData = {
        items: productData,
        deliveryAddress,
        paymentMethod: selectedPaymentMethod,
        totalAmount,
        deliveryCharges,
        promotionDiscount,
        cardDiscount,
        cardDiscountRequestId: activeCardRequest,
        orderId: currentOrderId
      };
      
      const response = await fetch('/api/order/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Order created:', data.order);
        
        // Clear cart
        dispatch(resetCart());
        
        // Redirect to success page
        router.push(`/order-success?orderId=${data.order.orderId}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Error placing order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyPromoCode = () => {
    if (promoCode.toLowerCase() === 'save10') {
      setPromotionDiscount(promotionDiscount + 100);
      setPromoCode("");
      alert('Promo code applied successfully!');
    } else {
      alert('Invalid promo code');
    }
  };

  const handleCardDiscountRequest = (requestId: string) => {
    if (hasPlacedOrder) return; // ✅ Prevent further action after success
    setActiveRequestId(requestId);
    setWaitingForPaymentRequest(true);
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session || !userInfo) {
    return null;
  }

  if (productData.length === 0) {
    return <div>Redirecting to cart...</div>;
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amazon_blue mx-auto"></div>
          <p className="mt-4 text-lg font-semibold">Processing your order...</p>
          <p className="text-gray-600">Please wait while we complete your purchase</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-amazon_blue">
              amazon
              <span className="text-sm text-gray-600">.in</span>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FaLock className="text-gray-600" />
                <span className="text-lg font-semibold">Secure checkout</span>
                <FaChevronDown className="text-gray-600" />
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Cart</div>
                <div className="font-semibold">{productData.length} items</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card Discount Banner */}
            {!activeCardRequest && !waitingForPaymentRequest && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FaCreditCard className="text-2xl text-blue-600" />
                    <div>
                      <p className="font-semibold text-gray-800">Looking for card discounts?</p>
                      <p className="text-sm text-gray-600">Save up to 10% with card-specific offers!</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCardDiscountModal(true)}
                    className="bg-amazon_blue text-white px-4 py-2 rounded-md hover:bg-amazon_yellow hover:text-black transition-colors flex items-center space-x-2"
                  >
                    <FaPercent />
                    <span>Check Offers</span>
                  </button>
                </div>
              </div>
            )}

            {/* Waiting for Payment Request */}
            {waitingForPaymentRequest && !showCardDiscountModal && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-blue-800">Waiting for cardholder to accept your payment request...</p>
                    <p className="text-sm text-blue-600">This may take a few moments. Please don't close this page.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Card Request Notification */}
            {activeCardRequest && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BsCheckCircleFill className="text-2xl text-green-600" />
                    <div>
                      <p className="font-semibold text-gray-800">Card discount applied!</p>
                      <p className="text-sm text-gray-600">
                        You're saving <FormattedPrice amount={cardDiscount} /> on this order
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Delivery Address Section */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${step >= 1 ? 'bg-amazon_blue' : 'bg-gray-300'}`}>
                    {step > 1 ? <BsCheckCircleFill /> : '1'}
                  </div>
                  <h2 className="text-xl font-semibold">Delivering to {deliveryAddress.name}</h2>
                </div>
                {step > 1 && (
                  <button 
                    onClick={() => setIsEditingAddress(true)}
                    className="text-amazon_blue hover:underline flex items-center space-x-1"
                  >
                    <FaEdit />
                    <span>Change</span>
                  </button>
                )}
              </div>

              {(step === 1 || isEditingAddress) ? (
                <form onSubmit={handleAddressSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={deliveryAddress.name}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amazon_blue focus:border-amazon_blue"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={deliveryAddress.phone}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amazon_blue focus:border-amazon_blue"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={deliveryAddress.addressLine1}
                      onChange={(e) => setDeliveryAddress({...deliveryAddress, addressLine1: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amazon_blue focus:border-amazon_blue"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      value={deliveryAddress.addressLine2}
                      onChange={(e) => setDeliveryAddress({...deliveryAddress, addressLine2: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amazon_blue focus:border-amazon_blue"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={deliveryAddress.city}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amazon_blue focus:border-amazon_blue"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={deliveryAddress.state}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, state: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amazon_blue focus:border-amazon_blue"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code</label>
                      <input
                        type="text"
                        value={deliveryAddress.pincode}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, pincode: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amazon_blue focus:border-amazon_blue"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    {isEditingAddress && (
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(false)}
                        className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-6 py-2 bg-amazon_yellow text-black rounded-md hover:bg-yellow-500 font-semibold"
                    >
                      {isEditingAddress ? 'Update Address' : 'Use This Address'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-gray-700">
                  <p className="font-medium">{deliveryAddress.name}</p>
                  <p>{deliveryAddress.addressLine1}</p>
                  {deliveryAddress.addressLine2 && <p>{deliveryAddress.addressLine2}</p>}
                  <p>{deliveryAddress.city}, {deliveryAddress.state}, {deliveryAddress.pincode}, {deliveryAddress.country}</p>
                  {deliveryAddress.phone && <p>Phone: {deliveryAddress.phone}</p>}
                </div>
              )}
            </div>

            {/* Payment Method Section */}
            {step >= 2 && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${step >= 2 ? 'bg-amazon_blue' : 'bg-gray-300'}`}>
                    {step > 2 ? <BsCheckCircleFill /> : '2'}
                  </div>
                  <h2 className="text-xl font-semibold">Payment method</h2>
                </div>

                {step === 2 ? (
                  <div className="space-y-3">
                    {/* Your available balance */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Your available balance</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">+</span>
                        <input
                          type="text"
                          placeholder="Enter Code"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <button 
                          onClick={applyPromoCode}
                          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                        >
                          Apply
                        </button>
                      </div>
                    </div>

                    {paymentMethods.map((method) => (
                      <div key={method.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="payment"
                            id={method.id}
                            onChange={() => handlePaymentSelection(method)}
                          />
                          <label htmlFor={method.id} className="flex-1 cursor-pointer">
                            <div className="font-medium">{method.name}</div>
                            {method.details && (
                              <div className="text-sm text-gray-600">{method.details}</div>
                            )}
                          </label>
                          {method.logo && (
                            <div className="text-sm text-gray-500 uppercase">{method.logo}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedPaymentMethod?.name}</p>
                      <p className="text-sm text-gray-600">{selectedPaymentMethod?.details}</p>
                    </div>
                    <button 
                      onClick={() => setStep(2)}
                      className="text-amazon_blue hover:underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Review Items Section */}
            {step >= 3 && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amazon_blue text-white text-sm font-semibold">
                    3
                  </div>
                  <h2 className="text-xl font-semibold">Review items and delivery</h2>
                </div>

                <div className="space-y-4">
                  {productData.map((item: StoreProduct) => (
                    <div key={item._id} className="flex space-x-4 border-b pb-4">
                      <img 
                        src={item.image} 
                        alt={item.title}
                        className="w-20 h-20 object-contain"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{item.title}</h3>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        <p className="font-semibold">
                          <FormattedPrice amount={item.price * item.quantity} />
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                    className="w-full py-3 bg-amazon_yellow text-black rounded-md hover:bg-yellow-500 font-semibold text-lg disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Place your order'}
                  </button>
                  <p className="text-xs text-gray-600 mt-2">
                    By placing your order, you agree to Amazon's privacy notice and conditions of use.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm sticky top-6">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span><FormattedPrice amount={totalAmount} /></span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span>
                    {deliveryCharges === 0 ? 'FREE' : <FormattedPrice amount={deliveryCharges} />}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span><FormattedPrice amount={totalAmount + deliveryCharges} /></span>
                </div>
                {promotionDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Promotion Applied:</span>
                    <span>-<FormattedPrice amount={promotionDiscount} /></span>
                  </div>
                )}
                {cardDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Card Discount:</span>
                    <span>-<FormattedPrice amount={cardDiscount} /></span>
                  </div>
                )}
                <hr className="my-2" />
                <div className="flex justify-between font-bold text-lg text-red-600">
                  <span>Order Total:</span>
                  <span><FormattedPrice amount={totalAmount + deliveryCharges - promotionDiscount - cardDiscount} /></span>
                </div>
              </div>

              {deliveryCharges === 0 && (
                <div className="mt-4 p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-700">
                    🚚 Your order qualifies for FREE Delivery. Choose this option at checkout.
                  </p>
                </div>
              )}

              {cardDiscount > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-700">
                    💳 Card discount applied! You're saving <FormattedPrice amount={cardDiscount} />
                  </p>
                </div>
              )}
              
              {currentOrderId && (
                <div className="mt-4 p-2 bg-gray-50 rounded-md">
                  <p className="text-xs text-gray-600">Order ID: {currentOrderId}</p>
               </div>
             )}
           </div>
         </div>
       </div>
     </div>

     {/* Card Discount Modal */}
     <CardDiscountModal
       isOpen={showCardDiscountModal}
       onClose={() => setShowCardDiscountModal(false)}
       products={productData}
       totalAmount={totalAmount}
       onRequestSent={handleCardDiscountRequest}
       orderId={currentOrderId}
     />
   </div>
 );
};

export default CheckoutPage;