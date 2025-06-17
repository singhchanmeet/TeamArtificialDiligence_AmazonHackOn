import React from "react";
import Link from "next/link";
import { BsCheckCircleFill } from "react-icons/bs";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { resetCart } from "@/store/nextSlice"; 

const OrderSuccessPage = () => {
    const router = useRouter();
    const dispatch = useDispatch();

    useEffect(() => {
        // Clear the cart after successful order
        dispatch(resetCart());
    }, [dispatch]);

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
                        #{Math.random().toString(36).substr(2, 9).toUpperCase()}
                    </div>
                </div>

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
        </div>
    );
};

export default OrderSuccessPage;