// /src/components/ChatBubble.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const ChatBubble = ({ message, isUserMessage }) => {
  return (
    <View
      style={[
        styles.bubble,
        isUserMessage ? styles.userBubble : styles.otherBubble,
      ]}
    >
      <Text style={styles.messageText}>{message.text}</Text>
      <Text style={styles.timestamp}>
        {new Date(message.timestamp?.seconds * 1000).toLocaleTimeString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 5,
    maxWidth: "80%",
  },
  userBubble: {
    backgroundColor: "#e1f5fe",
    alignSelf: "flex-end",
  },
  otherBubble: {
    backgroundColor: "#f1f1f1",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: "#aaa",
  },
});

export default ChatBubble;
