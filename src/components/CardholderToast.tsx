import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { FaCreditCard, FaTimes } from "react-icons/fa";
import { BsArrowRight, BsCashCoin } from "react-icons/bs";

const CardholderToast = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user has already dismissed or is already a cardholder
    const dismissed = localStorage.getItem('cardholderToastDismissed');
    const isCardholder = localStorage.getItem('registeredCards');
    
    if (!dismissed && !isCardholder) {
      // Show toast after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('cardholderToastDismissed', 'true');
  };

  const handleRegisterClick = () => {
    router.push('/cardholder-dashboard');
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-gradient-to-r from-amazon_blue to-blue-700 text-white rounded-lg shadow-xl p-4 max-w-md">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white hover:text-gray-200"
        >
          <FaTimes />
        </button>
        
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="bg-white rounded-full p-2">
              <FaCreditCard className="text-2xl text-amazon_blue" />
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1 flex items-center space-x-2">
              <span>Latest - Earn with Your Cards!</span>
              <BsCashCoin className="text-yellow-400" />
            </h3>
            <p className="text-sm text-gray-200 mb-3">
              Register as a cardholder and earn commissions by helping others save on their purchases.
            </p>
            
            <button
              onClick={handleRegisterClick}
              className="bg-amazon_yellow text-black px-4 py-2 rounded-md hover:bg-yellow-500 font-semibold text-sm inline-flex items-center space-x-2 transition-colors"
            >
              <span>Start Earning Now</span>
              <BsArrowRight />
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CardholderToast;