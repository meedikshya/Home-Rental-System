import React from "react";
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

// Dummy landlords for testing
const landlords = [
  { id: "1", name: "Diyana Sharma" },
  { id: "2", name: "John Doe" },
  { id: "3", name: "Aarav Singh" },
];

const ChatList = () => {
  const navigation = useNavigation();

  const openChat = (landlord) => {
    navigation.navigate("ChatScreen", {
      landlordId: landlord.id,
      landlordName: landlord.name,
    });
  };

  const renderChatCard = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openChat(item)}>
      <View style={styles.cardContent}>
        <Text style={styles.landlordName}>{item.name}</Text>
        <Text style={styles.lastMessage}>Tap to chat</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={landlords}
      renderItem={renderChatCard}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cardContent: {
    flexDirection: "column",
  },
  landlordName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  lastMessage: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
});

export default ChatList;
