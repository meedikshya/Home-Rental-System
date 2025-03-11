import React, { useState, useEffect, useCallback } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaExpand,
  FaTimes,
  FaCircle,
} from "react-icons/fa";

const ImageSlider = ({
  images = [],
  autoPlay = false,
  autoPlayInterval = 3000,
  showThumbnails = true,
  showFullscreenButton = true,
  onClose = null,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle image navigation
  const goToPrevious = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [currentIndex, images.length, isTransitioning]);

  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    const isLastSlide = currentIndex === images.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [currentIndex, images.length, isTransitioning]);

  const goToSlide = (slideIndex) => {
    if (isTransitioning || slideIndex === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(slideIndex);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  // Handle autoplay
  useEffect(() => {
    if (!autoPlay) return;

    const slideInterval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(slideInterval);
  }, [autoPlay, autoPlayInterval, goToNext]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, isFullscreen]);

  // Handle touch events for swipe
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 100) {
      // Swipe left
      goToNext();
    }

    if (touchStart - touchEnd < -100) {
      // Swipe right
      goToPrevious();
    }
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // If there are no images, show placeholder
  if (images.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg flex items-center justify-center h-64 text-gray-500">
        No images available
      </div>
    );
  }

  return (
    <>
      <div
        className={`relative overflow-hidden ${
          isFullscreen
            ? "fixed inset-0 z-50 bg-black flex items-center justify-center"
            : "rounded-lg"
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Current image */}
        <div
          className={`relative h-full w-full ${
            isTransitioning ? "transition-transform duration-500" : ""
          }`}
        >
          <img
            src={images[currentIndex]?.imageUrl || images[currentIndex]}
            alt={`Property ${currentIndex + 1}`}
            className={`w-full h-full object-contain ${
              isFullscreen ? "max-h-screen" : "h-64 md:h-96"
            }`}
            loading="lazy"
          />

          {/* Image counter */}
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white text-sm px-2 py-1 rounded">
            {currentIndex + 1} / {images.length}
          </div>
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition"
            >
              <FaArrowLeft />
            </button>
            <button
              onClick={goToNext}
              className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition"
            >
              <FaArrowRight />
            </button>
          </>
        )}

        {/* Fullscreen button */}
        {showFullscreenButton && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition"
          >
            {isFullscreen ? <FaTimes /> : <FaExpand />}
          </button>
        )}

        {/* Close button (for modal mode) */}
        {isFullscreen && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 left-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition"
          >
            <FaTimes />
          </button>
        )}

        {/* Dot indicators for small screens */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {images.length > 1 &&
            images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  currentIndex === index ? "bg-white" : "bg-white bg-opacity-50"
                }`}
              />
            ))}
        </div>
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && !isFullscreen && (
        <div className="mt-2 flex gap-1 overflow-x-auto pb-2 hide-scrollbar">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`flex-shrink-0 cursor-pointer w-16 h-16 md:w-20 md:h-20 border-2 rounded-md overflow-hidden transition ${
                index === currentIndex
                  ? "border-blue-500 opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={image.imageUrl || image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </>
  );
};

// Utility component for fullscreen mode
export const FullScreenImageSlider = ({
  images,
  initialIndex = 0,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <ImageSlider
        images={images}
        initialIndex={initialIndex}
        showThumbnails={true}
        showFullscreenButton={false}
        onClose={onClose}
        autoPlay={false}
      />
    </div>
  );
};

export default ImageSlider;
