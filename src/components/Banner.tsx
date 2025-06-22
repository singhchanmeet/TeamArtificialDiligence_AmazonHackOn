import React from "react";
import { Carousel } from "react-responsive-carousel";
import Image from "next/image";

const Banner = () => {
  return (
    <div className="relative mt-1">
      <Carousel autoPlay infiniteLoop showStatus={false} showIndicators={false} interval={3000}>
        <div><Image priority src="/images/slider/slide1.jpg" alt="slide 1" width={1920} height={600} /></div>
        <div><Image src="/images/slider/slide2.jpg" alt="slide 2" width={1920} height={600} /></div>
        <div><Image src="/images/slider/slide3.jpg" alt="slide 3" width={1920} height={600} /></div>
        <div><Image src="/images/slider/slide4.jpg" alt="slide 4" width={1920} height={600} /></div>
        <div><Image src="/images/slider/slide5.jpg" alt="slide 5" width={1920} height={600} /></div>
        <div><Image src="/images/slider/slide6.jpg" alt="slide 6" width={1920} height={600} /></div>
        <div><Image src="/images/slider/slide7.jpg" alt="slide 7" width={1920} height={600} /></div>
        <div><Image src="/images/slider/slide8.jpg" alt="slide 8" width={1920} height={600} /></div>
      </Carousel>
      <div className="w-full h-40 bg-gradient-to-t from-gray-100 to-transparent absolute bottom-0 z-20"></div>
    </div>
  );
};

export default Banner;
