import React from "react";
import {ProductProps} from "../../type";
import Image from "next/image";
import Link from "next/link";
import { HiShoppingCart } from "react-icons/hi";
import { FaHeart, FaCheckCircle } from "react-icons/fa";
import { SiPrime } from "react-icons/si";
import FormattedPrice from "./FormattedPrice";
import { useDispatch } from "react-redux";
import { addToCart, addToFavorite } from "@/store/nextSlice";
import { useRouter } from 'next/router';

const Products = ({productData} : any) =>{
    const dispatch = useDispatch();
    const router = useRouter();

    const handleBuyNow = (product: ProductProps) => {
        dispatch(addToCart({
            id: product.id,
            title: product.title,
            price: product.price,
            description: product.description,
            category: product.category,
            image: product.image,
            quantity: 1,
        }));
        router.push('/cart');
    };

    return(
        <div className="w-full px-4 md:px-6 py-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {productData.map((product: ProductProps) =>(
                    <div key={product.id} className="relative w-full bg-white text-black p-4 border border-gray-200
                    rounded-sm hover:border-transparent hover:shadow-amazonCard transition-all duration-200">
                        {/* Quick Action Buttons */}
                        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                            <button 
                                onClick={() => dispatch(
                                    addToFavorite({
                                        id: product.id,
                                        title: product.title,
                                        price: product.price,
                                        description: product.description,
                                        category: product.category,
                                        image: product.image,
                                        quantity: 1,
                                    })
                                )} 
                                className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-full
                                hover:bg-gray-100 cursor-pointer duration-300"
                            >
                                <FaHeart className="text-gray-500 hover:text-amazon_blue text-xl"/>
                            </button>
                            <button 
                                onClick={() => dispatch(
                                    addToCart({
                                        id: product.id,
                                        title: product.title,
                                        price: product.price,
                                        description: product.description,
                                        category: product.category,
                                        image: product.image,
                                        quantity: 1,
                                    })
                                )} 
                                className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-full
                                hover:bg-gray-100 cursor-pointer duration-300"
                            >
                                <HiShoppingCart className="text-gray-500 hover:text-amazon_blue text-xl"/>
                            </button>
                        </div>

                        {/* Image Section - Clickable to product details */}
                        <Link href={`/product/${product.id}`}>
                            <div className="w-full h-[200px] relative cursor-pointer">
                                <Image 
                                    className="w-full h-full object-contain mix-blend-multiply hover:scale-105 transition-transform duration-300" 
                                    width={300} 
                                    height={300} 
                                    src={product.image} 
                                    alt="productImg"
                                />
                            </div>
                        </Link>

                        {/* Content Section */}
                        <div className="pt-4 px-2 flex flex-col gap-3">
                            {/* Title - Clickable to product details */}
                            <Link href={`/product/${product.id}`}>
                                <h2 className="text-sm font-medium line-clamp-2 text-[#0F1111] hover:text-[#C7511F] cursor-pointer">
                                    {product.title}
                                </h2>
                            </Link>
                            
                            {/* Ratings */}
                            <div className="flex items-center gap-2">
                                <div className="flex text-[#F5A623]">
                                    {"★".repeat(4)}{"☆".repeat(1)}
                                </div>
                                <span className="text-sm text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer">
                                    {Math.floor(Math.random() * 5000)}
                                </span>
                            </div>

                            {/* Price Section */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">₹</span>
                                <span className="text-xl font-medium">{Math.floor(product.price)}</span>
                                <span className="text-xs text-gray-500">00</span>
                                
                                <span className="ml-1 text-xs text-gray-500">
                                    List Price: <span className="line-through">₹{Math.floor(product.price * 1.2)}</span>
                                </span>
                            </div>

                            {/* Prime Badge */}
                            <div className="flex items-center gap-1">
                                <SiPrime className="text-[#00A8E1] text-lg"/>
                                <span className="text-xs">FREE Delivery</span>
                            </div>

                            {/* Stock Status */}
                            <div className="flex items-center gap-1">
                                <FaCheckCircle className="text-[#007600] text-sm"/>
                                <span className="text-sm text-[#007600]">In Stock</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2 mt-2">
                                <button 
                                    onClick={() => dispatch(
                                        addToCart({
                                            id: product.id,
                                            title: product.title,
                                            price: product.price,
                                            description: product.description,
                                            category: product.category,
                                            image: product.image,
                                            quantity: 1,
                                        })
                                    )} 
                                    className="h-[30px] w-full font-normal bg-[#FFD814] text-[13px] text-black rounded-full 
                                    border border-[#FCD200] hover:bg-[#F7CA00] duration-300"
                                >
                                    Add to Cart
                                </button>
                                <button 
                                    onClick={() => handleBuyNow(product)}
                                    className="h-[30px] w-full font-normal bg-[#FFA41C] text-[13px] text-black rounded-full 
                                    border border-[#FF8F00] hover:bg-[#FA8900] duration-300"
                                >
                                    Buy Now
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
        </div>
    );
};

export default Products;