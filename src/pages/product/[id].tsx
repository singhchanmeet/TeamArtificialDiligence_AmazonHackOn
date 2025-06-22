import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Header from "@/components/header/Header";
import HeaderBottom from "@/components/header/HeaderBottom";
import Footer from "@/components/Footer";
import ProductDetails from "@/components/ProductDetails";
import { ProductProps } from "../../../type";

interface ProductPageProps {
  product: ProductProps | null;
}

const ProductPage = ({ product }: ProductPageProps) => {
  const router = useRouter();

  if (router.isFallback) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <HeaderBottom />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-medium mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-4">The product you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-amazon_blue text-white px-6 py-3 rounded hover:bg-amazon_blue/90"
            >
              Go Back to Home
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 bg-white">
        <ProductDetails product={product} />
      </main>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!;
  let product = null;

  try {
    // First try to fetch from the API
    const res = await fetch(`https://fakestoreapi.com/products/${id}`);
    if (res.ok) {
      product = await res.json();
      // Convert price from USD to INR
      if (product) {
        (product as ProductProps).price = Math.floor((product as ProductProps).price * 80);
      }
    }
  } catch (error) {
    console.error("Error fetching product:", error);
  }

  // If API fails, try to get from fallback data
  if (!product) {
    try {
      const path = require("path");
      const fs = require("fs").promises;
      const filePath = path.join(process.cwd(), "src", "data", "fallbackData.json");
      const fallbackData = await fs.readFile(filePath, "utf-8");
      const products = JSON.parse(fallbackData);
      
      product = products.find((p: ProductProps) => p.id === parseInt(id as string));
      if (product) {
        // Convert price from USD to INR
        (product as ProductProps).price = Math.floor((product as ProductProps).price * 80);
      }
    } catch (fallbackError) {
      console.error("Error loading fallback data:", fallbackError);
    }
  }

  return {
    props: {
      product,
    },
  };
};

export default ProductPage;