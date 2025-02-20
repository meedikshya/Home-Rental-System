import React from "react";
import { ScrollView, Text, View } from "react-native";

const Page = () => {
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-3xl font-bold text-gray-800 mb-4">Explore</Text>
      </View>
    </ScrollView>
  );
};

export default Page;
