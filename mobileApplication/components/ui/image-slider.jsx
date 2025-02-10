import React from "react";
import { View, Image } from "react-native";
import Carousel from "react-native-snap-carousel";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

const ImageSlider = ({ images }) => {
  const renderCarouselItem = ({ item }) => (
    <Image
      source={{ uri: item }}
      className="w-full h-52 rounded-lg"
      resizeMode="cover"
      onError={(e) => {
        console.error("Image load error:", e.nativeEvent.error);
        e.target.src = "https://via.placeholder.com/300.png";
      }}
    />
  );

  return (
    <View className="mb-4">
      <Carousel
        data={images}
        renderItem={renderCarouselItem}
        sliderWidth={wp("90%")}
        itemWidth={wp("90%")}
        loop={true}
      />
    </View>
  );
};

export default ImageSlider;
