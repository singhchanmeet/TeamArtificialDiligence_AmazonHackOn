import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BsCheckCircleFill } from "react-icons/bs";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import { resetCart } from "@/store/nextSlice";
import { useSession } from "next-auth/react";
import CardholderRatingModal from "@/components/CardholderRatingModal";

interface OrderDetails {
  orderId: string;
  totalAmount: number;
  cardDiscount: number;
  cardDiscountRequestId?: string;
  paymentRequest?: {
    cardholderName: string;
    cardDetails: {
      bankName: string;
      cardType: string;
      lastFourDigits: string;
    };
  };
}

const OrderSuccessPage = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const { data: session } = useSession();
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Clear the cart after successful order
        dispatch(resetCart());
        
        // Fetch order details if orderId is provided
        const orderId = router.query.orderId as string;
        if (orderId && session) {
            fetchOrderDetails(orderId);
        } else {
            setLoading(false);
        }
    }, [dispatch, router.query.orderId, session]);

    const fetchOrderDetails = async (orderId: string) => {
        try {
            const response = await fetch(`/api/order/${orderId}`);
            if (response.ok) {
                const order = await response.json();
                setOrderDetails(order);
                
                // Show rating modal if order used card discount
                if (order.cardDiscountRequestId && order.cardDiscount > 0) {
                    // Delay showing the modal to let user see success message first
                    setTimeout(() => {
                        setShowRatingModal(true);
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Error fetching order details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRatingSubmitted = () => {
        console.log('Rating submitted successfully');
        // You can add additional logic here, like showing a success message
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amazon_blue mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading order details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="mb-6">
                    <BsCheckCircleFill className="text-6xl text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Placed Successfully!</h1>
                    <p className="text-gray-600">Thank you for your purchase. Your order has been confirmed.</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="text-sm text-gray-600 mb-2">Order Number</div>
                    <div className="font-bold text-lg text-amazon_blue">
                        {orderDetails?.orderId || `#${Math.random().toString(36).substr(2, 9).toUpperCase()}`}
                    </div>
                </div>

                {/* Card Discount Info */}
                {orderDetails?.cardDiscount && orderDetails.cardDiscount > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                            <BsCheckCircleFill className="text-green-500" />
                            <span className="text-sm font-medium text-green-800">Card Discount Applied!</span>
                        </div>
                        <div className="text-sm text-green-700">
                            You saved <span className="font-semibold">₹{orderDetails.cardDiscount.toLocaleString()}</span> on this order
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                            Rate your cardholder experience below
                        </div>
                    </div>
                )}

                <div className="text-sm text-gray-600 mb-6">
                    <p>You will receive an email confirmation shortly.</p>
                    <p>Expected delivery: 3-5 business days</p>
                </div>

                <div className="space-y-3">
                    <Link href="/orders">
                        <button className="w-full py-3 bg-amazon_blue text-white rounded-lg hover:bg-blue-700 font-semibold">
                            Track Your Order
                        </button>
                    </Link>
                    
                    <Link href="/">
                        <button className="w-full py-3 bg-amazon_yellow text-black rounded-lg hover:bg-yellow-500 font-semibold">
                            Continue Shopping
                        </button>
                    </Link>
                </div>
            </div>

            {/* Cardholder Rating Modal */}
            {showRatingModal && orderDetails && orderDetails.cardDiscount > 0 && (
                <CardholderRatingModal
                    isOpen={showRatingModal}
                    onClose={() => setShowRatingModal(false)}
                    orderId={orderDetails.orderId}
                    cardholderName={orderDetails.paymentRequest?.cardholderName || 'Cardholder'}
                    cardDetails={orderDetails.paymentRequest?.cardDetails || {
                        bankName: 'Unknown Bank',
                        cardType: 'Unknown',
                        lastFourDigits: '****'
                    }}
                    orderAmount={orderDetails.totalAmount}
                    discountAmount={orderDetails.cardDiscount}
                    onRatingSubmitted={handleRatingSubmitted}
                />
            )}
        </div>
    );
};

export default OrderSuccessPage;