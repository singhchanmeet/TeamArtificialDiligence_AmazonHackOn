import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { HiShoppingCart } from "react-icons/hi";
import { FaHeart, FaCheckCircle, FaShare, FaStar, FaStarHalfAlt } from "react-icons/fa";
import { SiPrime } from "react-icons/si";
import { BiCaretDown } from "react-icons/bi";
import { MdLocalShipping, MdSecurity } from "react-icons/md";
import { addToCart, addToFavorite } from "@/store/nextSlice";
import { ProductProps, stateProps } from "../../type";
import FormattedPrice from "./FormattedPrice";

interface ProductDetailsProps {
  product: ProductProps;
}

const ProductDetails = ({ product }: ProductDetailsProps) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state: stateProps) => state.next);
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("6.3 x 4 inch");

  // Mock data for additional product images
  const productImages = [
    product.image,
    product.image,
    product.image,
    product.image,
    product.image
  ];

  const handleAddToCart = () => {
    dispatch(addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      description: product.description,
      category: product.category,
      image: product.image,
      quantity: quantity,
    }));
  };

  const handleBuyNow = () => {
    dispatch(addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      description: product.description,
      category: product.category,
      image: product.image,
      quantity: quantity,
    }));
    router.push('/cart');
  };

  const handleAddToFavorite = () => {
    dispatch(addToFavorite({
      id: product.id,
      title: product.title,
      price: product.price,
      description: product.description,
      category: product.category,
      image: product.image,
      quantity: 1,
    }));
  };

  // Generate random ratings and reviews data
  const rating = 4.2;
  const totalReviews = Math.floor(Math.random() * 5000) + 1000;
  const originalPrice = Math.floor(product.price * 1.52);
  const discount = Math.floor(((originalPrice - product.price) / originalPrice) * 100);

  // Category-specific breadcrumbs
  const getBreadcrumbs = (category: string) => {
    const categoryMap: { [key: string]: string[] } = {
      "electronics": [
        "Electronics",
        "Computers & Accessories", 
        "Accessories & Peripherals",
        "Input Devices"
      ],
      "jewelery": [
        "Jewellery",
        "Fashion Jewellery",
        "Rings & Earrings",
        "Precious Metals"
      ],
      "men's clothing": [
        "Clothing & Accessories",
        "Men",
        "Men's Clothing",
        "Shirts & Tops"
      ],
      "women's clothing": [
        "Clothing & Accessories", 
        "Women",
        "Women's Clothing",
        "Dresses & Tops"
      ]
    };
    
    return categoryMap[category.toLowerCase()] || [
      "Home & Kitchen",
      "Kitchen & Dining", 
      "Small Appliances",
      "Specialty Tools"
    ];
  };

  // Format product description into bullet points
  const formatDescription = (description: string) => {
    // Split by periods and filter out empty strings
    const sentences = description.split('.').filter(sentence => sentence.trim().length > 0);
    return sentences.map(sentence => sentence.trim());
  };

  const breadcrumbs = getBreadcrumbs(product.category);
  const descriptionPoints = formatDescription(product.description);

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-4">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-600 mb-4">
        {breadcrumbs.map((crumb, index) => (
          <span key={index}>
            <span className="hover:text-amazon_blue cursor-pointer">{crumb}</span>
            {index < breadcrumbs.length - 1 && <span className="mx-2">›</span>}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Images */}
        <div className="lg:col-span-5">
          {/* Thumbnail Images */}
          <div className="flex lg:flex-col gap-2 mb-4 lg:mb-0 lg:w-12 lg:mr-4 lg:float-left">
            {productImages.slice(0, 5).map((img, index) => (
              <div
                key={index}
                className={`w-12 h-12 lg:w-10 lg:h-10 border cursor-pointer rounded ${
                  selectedImage === index ? 'border-amazon_blue' : 'border-gray-300'
                }`}
                onClick={() => setSelectedImage(index)}
              >
                <Image
                  src={img}
                  alt={`Product ${index + 1}`}
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
          </div>

          {/* Main Product Image */}
          <div className="lg:ml-16">
            <div className="relative w-full h-96 lg:h-[500px] border border-gray-300 rounded-lg p-4 bg-white">
              <Image
                src={productImages[selectedImage]}
                alt={product.title}
                fill
                className="object-contain"
              />
              <button
                onClick={handleAddToFavorite}
                className="absolute top-4 right-4 w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100"
              >
                <FaHeart className="text-gray-500 hover:text-red-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Middle Column - Product Info */}
        <div className="lg:col-span-4">
          <h1 className="text-2xl font-normal text-[#0F1111] mb-2">
            {product.title}
          </h1>

          <div className="text-sm text-amazon_blue hover:text-[#C7511F] hover:underline cursor-pointer mb-2">
            Visit the HUION Store
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center">
              <span className="text-sm mr-1">{rating}</span>
              <div className="flex text-[#F5A623]">
                {[...Array(4)].map((_, i) => (
                  <FaStar key={i} className="text-sm" />
                ))}
                <FaStarHalfAlt className="text-sm" />
              </div>
            </div>
            <span className="text-sm text-amazon_blue hover:text-[#C7511F] hover:underline cursor-pointer">
              {totalReviews.toLocaleString()} ratings
            </span>
            <span className="text-sm text-gray-500">|</span>
            <span className="text-sm text-amazon_blue hover:text-[#C7511F] hover:underline cursor-pointer">
              Search this page
            </span>
          </div>

          {/* Best Seller Badge */}
          <div className="inline-block bg-[#FF9900] text-white text-xs px-2 py-1 rounded mb-3">
            #1 Best Seller in {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
          </div>

          {/* Bought in past month */}
          <div className="text-sm text-gray-600 mb-4">
            1K+ bought in past month
          </div>

          {/* Limited time deal */}
          <div className="mb-4">
            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
              Limited time deal
            </span>
          </div>

          {/* Price */}
          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-red-600 text-sm">-{discount}%</span>
              <span className="text-3xl text-[#B12704]">₹{Math.floor(product.price).toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-600">
              M.R.P.: <span className="line-through">₹{originalPrice.toLocaleString()}</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Inclusive of all taxes<br />
              EMI starts at ₹106. No Cost EMI available{" "}
              <span className="text-amazon_blue hover:underline cursor-pointer">
                EMI options <BiCaretDown className="inline" />
              </span>
            </div>
          </div>

          {/* Size Selection */}
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Size: {selectedSize}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedSize("6.3 x 4 inch")}
                className={`px-3 py-1 border rounded text-sm ${
                  selectedSize === "6.3 x 4 inch"
                    ? "border-amazon_blue bg-blue-50"
                    : "border-gray-300"
                }`}
              >
                6.3 x 4 inch
              </button>
              <button
                onClick={() => setSelectedSize("10 x 6 inch")}
                className={`px-3 py-1 border rounded text-sm ${
                  selectedSize === "10 x 6 inch"
                    ? "border-amazon_blue bg-blue-50"
                    : "border-gray-300"
                }`}
              >
                10 x 6 inch
              </button>
            </div>
          </div>

          {/* Product Features */}
          <div className="border-t border-gray-300 pt-4">
            <h3 className="font-medium mb-3">About this item</h3>
            <ul className="text-sm space-y-2">
              {descriptionPoints.map((point, index) => (
                <li key={index}>• {point}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column - Purchase Options */}
        <div className="lg:col-span-3">
          <div className="border border-gray-300 rounded-lg p-4 bg-white sticky top-4">
            {/* Price */}
            <div className="mb-4">
              <div className="text-2xl text-[#B12704]">₹{Math.floor(product.price).toLocaleString()}</div>
              <div className="text-sm text-gray-600">
                <span className="line-through">₹{originalPrice.toLocaleString()}</span>
                <span className="text-red-600 ml-2">({discount}% off)</span>
              </div>
            </div>

            {/* Prime Delivery */}
            <div className="flex items-center gap-2 mb-2">
              <SiPrime className="text-[#00A8E1] text-lg" />
              <span className="text-sm font-medium">FREE delivery</span>
              <span className="font-bold">Today</span>
            </div>
            <div className="text-sm text-gray-600 mb-2">
              Order within <span className="text-green-700 font-medium">13 mins</span>.{" "}
              <span className="text-amazon_blue hover:underline cursor-pointer">Details</span>
            </div>

            {/* Delivery Location */}
            <div className="flex items-center gap-1 mb-4">
              <MdLocalShipping className="text-gray-600" />
              <span className="text-sm">
                Deliver to Chanmeet - New Delhi 110064
              </span>
            </div>

            {/* Stock Status */}
            <div className="text-green-700 text-lg font-medium mb-4">In Stock</div>
            <div className="text-sm text-gray-600 mb-4">
              Ships from <span className="font-medium">Amazon</span><br />
              Sold by <span className="text-amazon_blue hover:underline cursor-pointer">HUION Official Store</span>
            </div>

            {/* Quantity Selector */}
            <div className="mb-4">
              <label className="text-sm font-medium">Quantity:</label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleAddToCart}
                className="w-full bg-[#FFD814] hover:bg-[#F7CA00] text-black font-normal py-2 px-4 rounded-full border border-[#FCD200] transition-colors"
              >
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                className="w-full bg-[#FFA41C] hover:bg-[#FA8900] text-black font-normal py-2 px-4 rounded-full border border-[#FF8F00] transition-colors"
              >
                Buy Now
              </button>
            </div>

            {/* Secure Transaction */}
            <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
              <MdSecurity />
              <span>Secure transaction</span>
            </div>

            {/* Payment Options */}
            <div className="mt-4 text-sm">
              <div className="font-medium mb-1">Payment</div>
              <div className="text-amazon_blue hover:underline cursor-pointer">Secure transaction</div>
            </div>

            {/* Additional Options */}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Ships from</span>
                <span>Amazon</span>
              </div>
              <div className="flex justify-between">
                <span>Sold by</span>
                <span className="text-amazon_blue hover:underline cursor-pointer">HUION Official Store</span>
              </div>
              <div className="flex justify-between">
                <span>Packaging</span>
                <span className="text-amazon_blue hover:underline cursor-pointer">Ships in product packaging</span>
              </div>
            </div>

            {/* Add to List */}
            <div className="mt-4 border-t pt-4">
              <button className="text-sm text-amazon_blue hover:underline">
                Add to List
              </button>
            </div>

            {/* Protection Plan */}
            <div className="mt-4 border border-gray-300 rounded p-3">
              <div className="text-sm font-medium mb-2">Add Protection Plan:</div>
              <div className="space-y-2 text-sm">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span>2-Year Protection for ₹299</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span>3-Year Protection for ₹399</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Description Section */}
      <div className="mt-8 border-t pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-medium mb-4">Product Description</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              {product.description}
            </p>
          </div>
          <div>
            <h2 className="text-xl font-medium mb-4">Technical Details</h2>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium">Brand</td>
                  <td className="py-2">HUION</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Model</td>
                  <td className="py-2">HS64</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Working Area</td>
                  <td className="py-2">6.3 x 4 inch</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Pressure Levels</td>
                  <td className="py-2">8192</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Compatibility</td>
                  <td className="py-2">Windows, macOS, Linux, Android</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;