import React from "react";
import Image from "../../assets/images/home.jpg";
import Search from "./Search";

const Banner = () => {
  return (
    <section className="relative w-full min-h-screen">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={Image}
          alt="Home"
          className="w-full h-full object-cover bg-fixed lg:bg-scroll"
        />
        {/* Overlay using your color scheme */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#002953]/80 to-[#002D5B]/80"></div>
      </div>

      {/* Text Content - Full Height Centering */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10">
        <h1 className="text-[clamp(32px,2vw+1.3rem,60px)] font-semibold leading-none mb-6 w-full">
          <span className="text-violet-700">Rent</span> Your Dream House With Us
        </h1>
        <p className="max-w-2xl px-4 mb-8 text-[clamp(16px,1.5vw+0.2rem,18px)]">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Officiis
          temporibus neque, dolorum totam, error unde quaerat adipisci eligendi
          veritatis inventore eaque deserunt fugiat sapiente, pariatur numquam
          molestiae voluptatem. A, eveniet!
        </p>
        <Search />
      </div>
    </section>
  );
};

export default Banner;
