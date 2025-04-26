import React, { useEffect, useMemo } from "react";
import { FaTimes } from "react-icons/fa";
import ImageSlider from "./Imageslider.js";

const ImageSliderModal = ({ isOpen, onClose, images }) => {
  const processedImages = useMemo(() => {
    if (!images || !Array.isArray(images)) return [];

    return images.map((img) => {
      if (typeof img === "string") {
        return { imageUrl: img };
      }
      return img;
    });
  }, [images]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      console.log("Modal received images:", images);
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen, images]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
      style={
        {
          // willChange: "transform, opacity",
        }
      }
    >
      {/* <div className="w-full h-full max-w-3xl p-4"> */}
      <div className="w-full h-full max-w-xl p-4">
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            type="button"
            className="bg-black bg-opacity-70 text-white p-2 rounded-full hover:bg-opacity-100 "
          >
            <FaTimes size={20} />
          </button>
        </div>

        <ImageSlider
          images={processedImages}
          showThumbnails={true}
          autoPlay={false}
          showFullscreenButton={false}
        />
      </div>
    </div>
  );
};

export default ImageSliderModal;
