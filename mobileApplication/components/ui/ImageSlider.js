import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Text,
  Animated, // Import Animated
} from "react-native";
import { AntDesign } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");

// Create animated flatlist
const AnimatedFlatList = Animated.createAnimatedComponent(Animated.FlatList);

const ImageSlider = ({
  images = [],
  imageHeight = 250,
  cardWidth,
  onImagePress,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const [loading, setLoading] = useState({});
  const slideWidth = cardWidth || screenWidth - 32; // Account for container padding
  const scrollX = useRef(new Animated.Value(0)).current; // Animated value for scroll position

  // Prepare data for infinite loop
  const extendedImages = React.useMemo(() => {
    return images.length > 1
      ? [images[images.length - 1], ...images, images[0]]
      : images;
  }, [images]);

  const initialScrollIndex = images.length > 1 ? 1 : 0;

  useEffect(() => {
    // Scroll to the second element to create the illusion of an infinite loop
    if (flatListRef.current && extendedImages.length > 0 && images.length > 1) {
      setTimeout(() => {
        flatListRef.current.scrollToIndex({
          index: initialScrollIndex,
          animated: false,
        });
      }, 0); // Delay the call to scrollToIndex
    }
  }, [images, extendedImages]);

  // Handle image loading
  const handleImageLoad = (index) => {
    setLoading((prev) => ({ ...prev, [index]: false }));
  };

  // Navigation - removed, as it's now infinite

  // Get image source
  const getImageSource = (image) => {
    if (typeof image === "string") {
      return { uri: image };
    }
    return { uri: image.imageUrl || image };
  };

  // Render slide
  const renderItem = ({ item, index }) => {
    const imageIndex = images.length > 1 ? index - 1 : index; // Adjust index for the original images array

    const inputRange = [
      (index - 1) * slideWidth,
      index * slideWidth,
      (index + 1) * slideWidth,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8], // Scale down the sides
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={{
          width: slideWidth,
          height: imageHeight,
          justifyContent: "center",
          alignItems: "center",
          transform: [{ scale }], // Apply scaling animation
        }}
      >
        {loading[index] !== false && (
          <ActivityIndicator
            style={{ position: "absolute", zIndex: 10 }}
            size="large"
            color="#0066cc"
          />
        )}
        <TouchableOpacity onPress={() => onImagePress(item)}>
          <Image
            source={getImageSource(item)}
            style={{
              width: slideWidth,
              height: imageHeight,
              borderRadius: 8,
            }}
            resizeMode="cover"
            onLoad={() => handleImageLoad(index)}
            onLoadStart={() =>
              setLoading((prev) => ({ ...prev, [index]: true }))
            }
          />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // If no images, show placeholder
  if (!images || images.length === 0) {
    return (
      <View
        style={{
          height: imageHeight,
          backgroundColor: "#f0f0f0",
          borderRadius: 8,
        }}
        className="justify-center items-center"
      >
        <Text className="text-gray-500 text-base">No images available</Text>
      </View>
    );
  }

  return (
    <View style={{ height: imageHeight }}>
      {/* Main slider */}
      <AnimatedFlatList
        ref={flatListRef}
        data={extendedImages}
        renderItem={renderItem}
        keyExtractor={(_, index) => `slide-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={slideWidth}
        decelerationRate="fast"
        snapToAlignment="center"
        getItemLayout={(_, index) => ({
          length: slideWidth,
          offset: slideWidth * index,
          index,
        })}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(
            event.nativeEvent.contentOffset.x / slideWidth
          );
          if (flatListRef.current && extendedImages.length > 2) {
            if (newIndex === 0) {
              // Scroll to the second last element without animation
              flatListRef.current.scrollToIndex({
                index: extendedImages.length - 2,
                animated: false,
              });
              setCurrentIndex(extendedImages.length - 3);
            } else if (newIndex === extendedImages.length - 1) {
              // Scroll to the second element without animation
              flatListRef.current.scrollToIndex({ index: 1, animated: false });
              setCurrentIndex(0);
            } else {
              setCurrentIndex(newIndex - 1);
            }
          }
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        bounces={false}
      />

      {/* Navigation buttons (hide) */}

      {/* Dot indicators - position at bottom of slider */}
      {images.length > 1 && (
        <View
          style={{
            position: "absolute",
            bottom: 10,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 20,
          }}
        >
          {images.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "white",
                opacity: currentIndex === index ? 1 : 0.6,
                marginHorizontal: 4,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.3,
                shadowRadius: 2,
                elevation: 2,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default ImageSlider;
