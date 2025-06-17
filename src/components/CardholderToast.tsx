import React from "react";
import { useRouter } from "next/router";
import { FaCreditCard } from "react-icons/fa";
import { BsArrowRight, BsCashCoin } from "react-icons/bs";
import { HiSpeakerphone } from "react-icons/hi";

const CardholderToast = () => {
  const router = useRouter();

  const handleRegisterClick = () => {
    router.push('/cardholder-dashboard');
  };

  return (
    <div className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 shadow-lg">
      <div className="max-w-screen-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="animate-pulse">
              <HiSpeakerphone className="text-3xl text-white" />
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <FaCreditCard className="text-2xl text-white" />
                <div>
                  <h3 className="font-bold text-white text-lg">
                    💰 Earn with Your Cards!
                  </h3>
                  <p className="text-sm text-white/90">
                    Register as a cardholder and earn commissions by helping others save
                  </p>
                </div>
              </div>
              
              <div className="hidden md:flex items-center space-x-2 text-white">
                <BsCashCoin className="text-2xl" />
                <span className="font-semibold">Earn 2% commission on every transaction</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleRegisterClick}
            className="bg-white text-black px-6 py-2 rounded-full hover:bg-gray-100 font-bold text-sm inline-flex items-center space-x-2 transition-all transform hover:scale-105 shadow-md"
          >
            <span>Start Earning Now</span>
            <BsArrowRight className="animate-bounce-x" />
          </button>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes bounce-x {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(4px);
          }
        }
        
        .animate-bounce-x {
          animation: bounce-x 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default CardholderToast;