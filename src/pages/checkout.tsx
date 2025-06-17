import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { StoreProduct, stateProps } from "../../type";
import FormattedPrice from "@/components/FormattedPrice";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FaLock, FaChevronDown, FaEdit, FaCreditCard, FaPercent } from "react-icons/fa";
import { BsCheckCircleFill } from "react-icons/bs";
import CardDiscountModal from "@/components/CardDiscountModal";

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
  const { data: session } = useSession();
  const router = useRouter();
  
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
    if (!session || !userInfo) {
      router.push('/signin');
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
    
    // Check for active card discount requests
    checkActiveCardRequests();
  }, [productData, session, userInfo, router]);

  const checkActiveCardRequests = () => {
    const requests = localStorage.getItem('paymentRequests');
    if (requests) {
      const parsedRequests = JSON.parse(requests);
      const userRequests = parsedRequests.filter((req: any) => 
        req.userEmail === session?.user?.email && 
        req.status === 'accepted'
      );
      
      if (userRequests.length > 0) {
        const latestRequest = userRequests[userRequests.length - 1];
        setActiveCardRequest(latestRequest.id);
        setCardDiscount(latestRequest.discountAmount);
      }
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
    if (!selectedPaymentMethod) return;
    
    try {
      const orderData = {
        items: productData,
        deliveryAddress,
        paymentMethod: selectedPaymentMethod,
        totalAmount: totalAmount + deliveryCharges - promotionDiscount - cardDiscount,
        cardDiscountRequestId: activeCardRequest,
        userEmail: session?.user?.email
      };
      
      console.log('Order placed:', orderData);
      
      // Update card request status if used
      if (activeCardRequest) {
        const requests = JSON.parse(localStorage.getItem('paymentRequests') || '[]');
        const updatedRequests = requests.map((req: any) => 
          req.id === activeCardRequest ? { ...req, status: 'completed' } : req
        );
        localStorage.setItem('paymentRequests', JSON.stringify(updatedRequests));
      }
      
      // Redirect to success page or order confirmation
      router.push('/order-success');
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Error placing order. Please try again.');
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
    setActiveCardRequest(requestId);
    alert('Payment request sent! We\'ll notify you once a cardholder accepts.');
  };

  if (!session || !userInfo) {
    return <div>Redirecting to login...</div>;
  }

  if (productData.length === 0) {
    return <div>Redirecting to cart...</div>;
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
            {!activeCardRequest && (
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
                    <div key={item.id} className="flex space-x-4 border-b pb-4">
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
                    className="w-full py-3 bg-amazon_yellow text-black rounded-md hover:bg-yellow-500 font-semibold text-lg"
                  >
                    Place your order
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
      />
    </div>
  );
};

export default CheckoutPage;