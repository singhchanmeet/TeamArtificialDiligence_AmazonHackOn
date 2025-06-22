import React from "react";
import Image from "next/image";

const Footer = () => {
  return (
    <div className="w-full h-20 bg-amazon_light text-gray-400 flex items-center justify-center gap-4">
      <Image
        className="w-24"
        src="/images/logo.png"
        alt="Logo"
        width={96}
        height={32}
      />
      <p className="text-sm -mt-4">
        All rights reserved{" "}
        <a
          className="hover:text-white hover:underline decoration-[1px] cursor-pointer duration-250"
          href=""
          target="_blank"
        >
          @Team Artificial Diligence
        </a>
      </p>
    </div>
  );
};

export default Footer;
