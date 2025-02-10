import React from "react";
import { View, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons"; // Import Ionicons for the search icon

const Search = ({ value, onChangeText }) => {
  return (
    <View className="flex-row items-center bg-gray-100 rounded-3xl p-3 mx-4 shadow-sm">
      {/* Search Icon Container */}
      <View className="mr-3">
        <Ionicons name="search" size={20} color="#8E8E8E" />
      </View>

      {/* Text Input Container */}
      <View className="flex-1">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Start your search"
          placeholderTextColor="#A9A9A9"
          className="text-base text-gray-800"
        />
      </View>
    </View>
  );
};

export default Search;
