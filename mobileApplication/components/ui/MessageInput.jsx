import React, { useState } from "react";
import {
  TextInput,
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MessageInput = ({ onSendMessage }) => {
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async () => {
    if (messageText.trim()) {
      try {
        setIsSending(true);
        await onSendMessage(messageText.trim());
        setMessageText("");
      } catch (error) {
        console.error("Error in send handler:", error);
      } finally {
        setIsSending(false);
      }
    }
  };

  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        value={messageText}
        onChangeText={setMessageText}
        placeholder="Type a message"
        multiline={true}
        maxHeight={100}
      />
      <TouchableOpacity
        style={[styles.sendButton, isSending && styles.sendingButton]}
        onPress={handleSendMessage}
        disabled={isSending || !messageText.trim()}
      >
        {isSending ? (
          <Text style={styles.buttonText}>...</Text>
        ) : (
          <Ionicons name="send" size={20} color="white" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    padding: 10,
    maxHeight: 100,
    backgroundColor: "#f8f8f8",
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#1DA1F2",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendingButton: {
    backgroundColor: "#a0d0f0",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default MessageInput;
