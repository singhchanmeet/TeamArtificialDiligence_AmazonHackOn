import Image from "next/image";
import { BiCaretDown } from "react-icons/bi";
import { HiOutlineSearch } from "react-icons/hi";
import { SlLocationPin } from "react-icons/sl";
import { FaCreditCard, FaCog } from "react-icons/fa";
import Link from "next/link";
import { useSelector, useDispatch } from "react-redux";
import { stateProps } from "../../../type";
import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { addUser } from "@/store/nextSlice";

const Header = () => {
  const { data: session } = useSession();
  const { productData, favoriteData, userInfo } = useSelector(
    (state: stateProps) => state.next
  );
  const dispatch = useDispatch();
  const [isCardholder, setIsCardholder] = useState(false);

  useEffect(() => {
    if (session) {
      dispatch(
        addUser({
          name: session?.user?.name,
          email: session?.user?.email,
          image: session?.user?.image,
        })
      );

      checkCardholderStatus();
    }
  }, [session]);

  const checkCardholderStatus = async () => {
    if (!session?.user?.email) return;

    try {
      const response = await fetch("/api/cardholder/profile");
      setIsCardholder(response.ok);
    } catch (error) {
      console.error("Error checking cardholder status:", error);
      setIsCardholder(false);
    }
  };

  return (
    <div className="w-full h-20 bg-amazon_blue text-lightText sticky top-0 z-50">
      <div className="h-full w-full mx-auto inline-flex items-center justify-between gap-1 mdl:gap-3 px-4">
        {/* logo */}
        <Link
          href="/"
          className="px-2 border border-transparent hover:border-white cursor-pointer duration-300 flex items-center justify-center h-[70%]"
        >
          <Image
            src="/images/logo.png"
            alt="logoImg"
            width={120}
            height={40}
            className="object-cover w-32"
            priority
          />
        </Link>

        {/* delivery */}
        <div className="px-2 border border-transparent hover:border-white cursor-pointer duration-300 items-center justify-center h-[70%] hidden xl:inline-flex gap-1">
          <SlLocationPin />
          <div className="text-xs">
            <p>Deliver to</p>
            <p className="text-white font-bold uppercase">India</p>
          </div>
        </div>

        {/* searchbar */}
        <div className="flex-1 h-10 hidden md:inline-flex items-center justify-between relative">
          <input
            className="w-full h-full rounded-md px-2 placeholder:text-sm text-base text-black border-[3px] border-transparent outline-none focus-visible:border-amazon_yellow"
            type="text"
            placeholder="Search amazon products"
          />
          <span className="w-12 h-full bg-amazon_yellow text-black text-2xl flex items-center justify-center absolute right-0 rounded-md rounded-br-md">
            <HiOutlineSearch />
          </span>
        </div>

        {/* signin */}
        {userInfo ? (
          <div className="flex items-center px-2 border border-transparent hover:border-white cursor-pointer duration-300 h-[70%] gap-1">
            <img
              src={userInfo.image}
              alt="userImage"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="text-xs text-gray-100 flex flex-col justify-between">
              <p className="text-white font-bold">{userInfo.name}</p>
              <p>{userInfo.email}</p>
            </div>
          </div>
        ) : (
          <div
            onClick={() => signIn()}
            className="text-xs text-gray-100 flex flex-col justify-center px-2 border border-transparent hover:border-white cursor-pointer duration-300 h-[70%]"
          >
            <p>Hello, sign in</p>
            <p className="text-white font-bold flex">
              Account & Lists <span><BiCaretDown /></span>
            </p>
          </div>
        )}

        {/* Orders Link */}
        {userInfo && (
          <Link
            href="/orders"
            className="text-xs text-gray-100 flex flex-col justify-center px-2 border border-transparent hover:border-white cursor-pointer duration-300 h-[70%]"
          >
            <p>Returns</p>
            <p className="text-white font-bold">& Orders</p>
          </Link>
        )}

        {/* Cardholder Dashboard Link */}
        {isCardholder && (
          <Link
            href="/cardholder-dashboard"
            className="text-xs text-gray-100 flex flex-col justify-center px-2 border border-transparent hover:border-white cursor-pointer duration-300 h-[70%] relative"
          >
            <div className="flex items-center gap-1">
              <FaCreditCard className="text-yellow-400" />
              <div>
                <p className="text-yellow-400">Cardholder</p>
                <p className="text-white font-bold">Dashboard</p>
              </div>
            </div>
          </Link>
        )}

        {/* Admin Dashboard Link */}
        {session?.user?.isAdmin && (
          <Link
            href="/admin/dashboard"
            className="text-xs text-gray-100 flex flex-col justify-center px-2 border border-transparent hover:border-white cursor-pointer duration-300 h-[70%] relative"
          >
            <div className="flex items-center gap-1">
              <FaCog className="text-yellow-400" />
              <div>
                <p className="text-yellow-400">Admin</p>
                <p className="text-white font-bold">Dashboard</p>
              </div>
            </div>
          </Link>
        )}

        {/* favorite */}
        <div className="text-xs text-gray-100 flex flex-col justify-center px-2 border border-transparent hover:border-white cursor-pointer duration-300 h-[70%] relative">
          <p>Marked</p>
          <p className="text-white font-bold">& Favorite</p>
          {favoriteData.length > 0 && (
            <span className="absolute right-2 top-2 w-4 h-4 border-[1px] border-gray-400 flex items-center justify-center text-xs text-amazon_yellow">
              {favoriteData.length}
            </span>
          )}
        </div>

        {/* cart */}
        <Link
          href="/cart"
          className="flex items-center px-2 border border-transparent hover:border-white cursor-pointer duration-300 h-[70%] relative"
        >
          <Image
            src="/images/cart.png"
            alt="cartImg"
            width={32}
            height={32}
            className="object-cover h-8 w-auto"
          />
          <p className="text-xs text-white font-bold mt-3">Cart</p>
          <span className="absolute text-amazon_yellow text-sm top-2 left-[29px] font-semibold">
            {productData ? productData.length : 0}
          </span>
        </Link>
      </div>
    </div>
  );
};

export default Header;
