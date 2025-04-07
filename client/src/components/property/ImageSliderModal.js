import React from "react";
import { FaTimes } from "react-icons/fa";
import ImageSlider from "./Imageslider.js";

const ImageSliderModal = ({ isOpen, onClose, images }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center animate-fadeIn">
      <div className="w-full h-full max-w-6xl p-4">
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="bg-black bg-opacity-70 text-white p-2 rounded-full hover:bg-opacity-100 transition-opacity"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <ImageSlider
          images={images}
          showThumbnails={true}
          autoPlay={false}
          showFullscreenButton={false}
        />
      </div>
    </div>
  );
};

export default ImageSliderModal;
