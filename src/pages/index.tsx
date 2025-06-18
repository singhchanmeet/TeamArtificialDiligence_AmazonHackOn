import HeaderBottom from "@/components/header/HeaderBottom";
import Header from "@/components/header/Header"
import Footer from "@/components/Footer";
import Banner from "@/components/Banner";
import Products from "@/components/Products";
import CardholderToast from "@/components/CardholderToast";
import {ProductProps} from "../../type";
import path from "path";
import { promises as fs } from "fs";

interface Props{
  productData: ProductProps;
}

export default function Home({productData}: Props) {
  console.log(productData);
  return (
    <main>
      {/* Cardholder Toast positioned right after header */}
      <div className="sticky top-20 z-40">
        <CardholderToast />
      </div>
      
      <div className="max-w-screen-2xl mx-auto">
        <Banner/>
        <div className="relative md:-mt020 lgl:-mt-32 xl:-mt-60 z-20 mb-10">
        <Products productData={productData}/>
        </div>
      </div>
      
    </main>
  );
}

export const getServerSideProps = async () => {
  let productData = [];

  try {
    const res = await fetch("https://fakestoreapi.com/products");
    if (!res.ok) throw new Error("Failed to fetch");

    productData = await res.json();
  } catch (error) {
    console.error("Error fetching from API, using fallback data:", error);

    const filePath = path.join(process.cwd(), "src", "data", "fallbackData.json");
    const fallbackData = await fs.readFile(filePath, "utf-8");
    productData = JSON.parse(fallbackData);
  }

  // Convert price from USD to INR and round to integer
  productData.forEach((product: any) => {
    product.price = Math.floor(product.price * 80);
  });

  return { props: { productData } };
};