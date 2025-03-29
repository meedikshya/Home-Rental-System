import React, { useState, useRef } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Text,
  FlatList,
  StyleSheet,
} from "react-native";

const { width: screenWidth } = Dimensions.get("window");

const ImageSlider = ({
  images = [],
  imageHeight = 200,
  cardWidth,
  onImagePress,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const slideWidth = cardWidth || screenWidth - 32;

  // Simplified image source handling
  const getImageSource = (image) => {
    if (typeof image === "string") {
      return { uri: image };
    }
    return { uri: image.imageUrl || image };
  };

  // Handle scroll end - much simpler approach
  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  // Simpler render item without animations
  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onImagePress && onImagePress(item)}
      style={[styles.slideContainer, { width: slideWidth }]}
    >
      <Image
        source={getImageSource(item)}
        style={[
          styles.image,
          {
            width: slideWidth,
            height: imageHeight,
          },
        ]}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  // If no images, show placeholder
  if (!images || images.length === 0) {
    return (
      <View style={[styles.placeholder, { height: imageHeight }]}>
        <Text style={styles.placeholderText}>No images available</Text>
      </View>
    );
  }

  return (
    <View style={{ height: imageHeight }}>
      {/* Simple FlatList without animation transformations */}
      <FlatList
        ref={flatListRef}
        data={images}
        renderItem={renderItem}
        keyExtractor={(_, index) => `slide-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={slideWidth}
        decelerationRate="fast"
        snapToAlignment="center"
        bounces={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
        initialNumToRender={1}
        maxToRenderPerBatch={3}
        windowSize={3}
        getItemLayout={(_, index) => ({
          length: slideWidth,
          offset: slideWidth * index,
          index,
        })}
      />

      {/* Simple dots indicator - no animations */}
      {images.length > 1 && (
        <View style={styles.dotsContainer}>
          {images.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[styles.dot, activeIndex === index && styles.activeDot]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  slideContainer: {
    overflow: "hidden",
  },
  image: {
    borderRadius: 8,
  },
  placeholder: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#888",
    fontSize: 16,
    fontWeight: "500",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: "#ffffff",
    width: 6,
    height: 6,
  },
});

export default ImageSlider;
