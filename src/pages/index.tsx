import HeaderBottom from "@/components/header/HeaderBottom";
import Header from "@/components/header/Header"
import Footer from "@/components/Footer";
import Banner from "@/components/Banner";
import Products from "@/components/Products";
import CardholderToast from "@/components/CardholderToast";
import {ProductProps} from "../../type"

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

export const getServerSideProps = async() =>{
  const res = await fetch("https://fakestoreapi.com/products")
  const productData = await res.json();

  // Multiply price of each product by 80 since the original price is in USD
  productData.forEach((product: any) => {
    product.price = Math.floor(product.price * 80)
  });

  return {props: {productData}};
}