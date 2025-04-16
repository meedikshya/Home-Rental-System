import React, { useState, useEffect, useCallback } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaExpand,
  FaTimes,
  FaCircle,
  FaSpinner,
} from "react-icons/fa";

const ImageSlider = ({
  images = [],
  autoPlay = false,
  autoPlayInterval = 3000,
  showThumbnails = true,
  showFullscreenButton = true,
  onClose = null,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [imagesLoaded, setImagesLoaded] = useState({});

  // Handle image navigation
  const goToPrevious = useCallback(() => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );

    setTimeout(() => setIsTransitioning(false), 500);
  }, [currentIndex, images.length, isTransitioning]);

  const goToNext = useCallback(() => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );

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
    let interval;
    if (autoPlay && images.length > 1) {
      interval = setInterval(goToNext, autoPlayInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoPlay, autoPlayInterval, goToNext, images.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isFullscreen || onClose) {
        switch (e.key) {
          case "ArrowLeft":
            goToPrevious();
            break;
          case "ArrowRight":
            goToNext();
            break;
          case "Escape":
            if (isFullscreen) {
              setIsFullscreen(false);
            } else if (onClose) {
              onClose();
            }
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goToNext, goToPrevious, isFullscreen, onClose]);

  // Handle touch events for swipe
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    }

    if (isRightSwipe) {
      goToPrevious();
    }

    // Reset values
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle image load error
  const handleImageError = (index) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

  // Handle image load success
  const handleImageLoad = (index) => {
    setImagesLoaded((prev) => ({ ...prev, [index]: true }));
  };

  // If there are no images, show placeholder
  if (!Array.isArray(images) || images.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg flex items-center justify-center h-64 text-gray-500">
        No images available
      </div>
    );
  }

  // Get image source with proper error handling
  const getImageSrc = (image, index) => {
    if (imageErrors[index]) {
      return "https://via.placeholder.com/800x600?text=Image+Not+Available";
    }

    if (typeof image === "string") {
      return image;
    }

    if (image && typeof image === "object") {
      return image.imageUrl || image.url || image.src || "";
    }

    return "";
  };

  return (
    <div
      className={`relative ${
        isFullscreen
          ? "fixed inset-0 z-[100] bg-black flex items-center justify-center"
          : "w-full"
      }`}
    >
      {/* Close fullscreen button */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute top-4 right-4 z-[101] bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-100 transition-colors"
        >
          <FaTimes size={20} />
        </button>
      )}

      {/* Main slider container */}
      <div
        className={`relative overflow-hidden ${
          isFullscreen ? "w-full h-full" : "rounded-lg"
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Current image */}
        <div className="h-full w-full">
          <div className="relative h-full w-full">
            {/* Loading spinner */}
            {!imagesLoaded[currentIndex] && !imageErrors[currentIndex] && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80">
                <FaSpinner className="animate-spin text-gray-500" size={32} />
              </div>
            )}

            <img
              src={getImageSrc(images[currentIndex], currentIndex)}
              alt={`Image ${currentIndex + 1}`}
              className={`w-full h-full object-contain ${
                isFullscreen ? "max-h-screen" : "max-h-[70vh]"
              } transition-opacity duration-300 ${
                imagesLoaded[currentIndex] ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => handleImageLoad(currentIndex)}
              onError={() => handleImageError(currentIndex)}
            />
          </div>

          {/* Image counter */}
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white text-sm px-2 py-1 rounded">
            {currentIndex + 1} / {images.length}
          </div>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute top-1/2 -translate-y-1/2 left-2 bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-100 transition-colors focus:outline-none"
                aria-label="Previous image"
              >
                <FaArrowLeft size={20} />
              </button>
              <button
                onClick={goToNext}
                className="absolute top-1/2 -translate-y-1/2 right-2 bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-100 transition-colors focus:outline-none"
                aria-label="Next image"
              >
                <FaArrowRight size={20} />
              </button>
            </>
          )}

          {/* Fullscreen button */}
          {showFullscreenButton && !isFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-100 transition-colors focus:outline-none"
              aria-label="Toggle fullscreen"
            >
              <FaExpand size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <div
          className={`flex overflow-x-auto gap-2 py-3 mt-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 ${
            isFullscreen ? "px-10 absolute bottom-4 left-0 right-0" : ""
          }`}
        >
          {images.map((image, index) => (
            <div
              key={`thumb-${index}`}
              onClick={() => goToSlide(index)}
              className={`relative flex-shrink-0 cursor-pointer transition-all ${
                currentIndex === index
                  ? "border-2 border-blue-500 rounded-md"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={getImageSrc(image, `thumb-${index}`)}
                alt={`Thumbnail ${index + 1}`}
                className={`h-16 w-16 object-cover rounded-md ${
                  isFullscreen ? "md:h-20 md:w-20" : ""
                }`}
              />
              {currentIndex === index && (
                <FaCircle
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 text-blue-500"
                  size={8}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
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
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[60] bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-100 transition-colors"
        aria-label="Close fullscreen"
      >
        <FaTimes size={20} />
      </button>

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
