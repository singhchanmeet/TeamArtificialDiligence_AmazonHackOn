import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { FaCreditCard } from "react-icons/fa";
import { BsArrowRight, BsCashCoin } from "react-icons/bs";
import { HiSpeakerphone } from "react-icons/hi";
import { useSession } from "next-auth/react";

const CardholderToast = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isCardholder, setIsCardholder] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    const fetchCardholderStatus = async () => {
      if (status === "authenticated") {
        try {
          const res = await fetch("/api/cardholder/profile");
          if (res.ok) {
            setIsCardholder(true); // user is a cardholder
          } else {
            setIsCardholder(false); // not a cardholder
          }
        } catch (error) {
          console.error("Error checking cardholder status:", error);
          setIsCardholder(false);
        }
      } else {
        setIsCardholder(false); // not logged in = show toast
      }
    };

    fetchCardholderStatus();
  }, [status]);

  const handleRegisterClick = () => {
    router.push("/cardholder-dashboard");
  };

  // Don't show toast while loading or if user is already a cardholder
  if (isCardholder || isCardholder === null || (session && session.user.isAdmin)) return null;

  return (
    <div className="w-full bg-gradient-to-r from-yellow-400 via-yellow-600 to-red-500 shadow-xl animate-fadein sticky top-20 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 py-2.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
          <div className="flex items-center space-x-4">
            <HiSpeakerphone className="text-4xl text-white animate-pulse" />
            <div className="space-y-1">
              <h3 className="font-extrabold text-white text-xl sm:text-2xl tracking-wide">
                💳 Introducing Cardholder Earnings!
              </h3>
              <p className="text-sm sm:text-base text-white/90 max-w-md">
                Turn your everyday card usage into a money-making opportunity. Earn 2% on every transaction others make using your shared benefits.
              </p>
            </div>
          </div>

          <button
            onClick={handleRegisterClick}
            className="bg-white text-black px-6 py-2 rounded-full hover:bg-gray-100 font-semibold text-sm sm:text-base inline-flex items-center space-x-2 transition-all transform hover:scale-105 shadow-md border border-black/10"
          >
            <span>Become a Cardholder</span>
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
            transform: translateX(6px);
          }
        }

        @keyframes fadein {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-bounce-x {
          animation: bounce-x 1.4s ease-in-out infinite;
        }

        .animate-fadein {
          animation: fadein 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CardholderToast;
