import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  TextInput,
  Keyboard,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import useChat from "../../hooks/useChat";
import { getAuth } from "firebase/auth";
import ApiHandler from "../../api/ApiHandler";

const { width } = Dimensions.get("window");

const Chat = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const {
    landlordId,
    landlordName,
    renterName,
    landlordFirebaseId: initialLandlordFirebaseId,
  } = route.params;

  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentFirebaseId, setCurrentFirebaseId] = useState(null);
  const [landlordFirebaseId, setLandlordFirebaseId] = useState(
    initialLandlordFirebaseId
  );

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          const firebaseUserId = currentUser.uid;
          setCurrentFirebaseId(firebaseUserId);

          // Use a non-blocking approach for better performance
          ApiHandler.get(`/Users/firebase/${firebaseUserId}`)
            .then((response) => {
              if (response) {
                setCurrentUserId(response);
              }
            })
            .catch((err) => console.error("Error fetching user data:", err));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchLandlordFirebaseId = async () => {
      if (initialLandlordFirebaseId) {
        return;
      }

      try {
        // Non-blocking approach for better performance
        ApiHandler.get(`/Users/firebaseByUserId/${landlordId}`)
          .then((response) => {
            if (response) {
              setLandlordFirebaseId(response);
            }
          })
          .catch((err) =>
            console.error("Error fetching landlord Firebase ID:", err)
          );
      } catch (error) {
        console.error("Error fetching landlord Firebase ID:", error);
      }
    };

    if (landlordId) {
      fetchLandlordFirebaseId();
    }
  }, [landlordId, initialLandlordFirebaseId]);

  const chatId =
    currentUserId && landlordId ? `chat_${landlordId}_${currentUserId}` : null;

  const { messages, loading, error, sendNewMessage } = useChat(
    chatId,
    currentFirebaseId,
    landlordFirebaseId
  );

  const isFromCurrentUser = (message) => {
    if (!message || !currentFirebaseId) return false;
    return message.senderId === currentFirebaseId;
  };

  const getMessageText = (message) => {
    if (!message) return "No message";
    if (typeof message.text === "string") {
      return message.text;
    }
    if (message.text && typeof message.text === "object" && message.text.text) {
      return message.text.text;
    }
    if (message.body) return message.body;
    if (message.content) return message.content;
    return "Message content unavailable";
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "Just now";

    let date;
    if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return "Just now";
    }

    // Format time
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return `${date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      })} ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
  };

  const handleSend = async () => {
    if (!messageText.trim()) return;

    if (!currentFirebaseId || !landlordFirebaseId || !chatId) {
      console.error("Missing required IDs:", {
        currentFirebaseId,
        landlordFirebaseId,
        chatId,
      });
      return;
    }

    Keyboard.dismiss();
    setIsSending(true);
    try {
      const messageData = {
        text: messageText.trim(),
        senderId: currentFirebaseId,
        internalUserId: currentUserId,
        senderEmail: getAuth().currentUser?.email || "",
        receiverId: landlordFirebaseId,
        timestamp: new Date(),
      };

      await sendNewMessage(messageData);
      setMessageText("");

      // Scroll to bottom after sending
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 70}
    >
      <StatusBar backgroundColor="#20319D" barStyle="light-content" />

      {/* Chat Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerUserInfo}>
            <Image
              source={{
                uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  landlordName || "User"
                )}&background=20319D&color=fff`,
              }}
              style={styles.headerAvatar}
            />
            <Text style={styles.headerTitle}>{landlordName}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      {/* Chat Content */}
      <View style={styles.chatContainer}>
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#20319D" />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
            <Text style={styles.errorText}>Error loading messages</Text>
            <TouchableOpacity style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id || Math.random().toString()}
            contentContainerStyle={[
              styles.messageList,
              messages.length === 0 && styles.emptyMessageList,
            ]}
            renderItem={({ item }) => {
              const isCurrentUser = isFromCurrentUser(item);
              return (
                <View
                  style={[
                    styles.messageBubbleContainer,
                    isCurrentUser
                      ? styles.currentUserContainer
                      : styles.otherUserContainer,
                  ]}
                >
                  {!isCurrentUser && (
                    <Image
                      source={{
                        uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          landlordName || "User"
                        )}&background=20319D&color=fff`,
                      }}
                      style={styles.messageAvatar}
                    />
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      isCurrentUser
                        ? styles.currentUserBubble
                        : styles.otherUserBubble,
                    ]}
                  >
                    <Text style={styles.messageText}>
                      {getMessageText(item)}
                    </Text>
                    <Text style={styles.messageTime}>
                      {formatMessageTime(item.timestamp)}
                    </Text>
                  </View>
                </View>
              );
            }}
            showsVerticalScrollIndicator={true}
            scrollEventThrottle={16}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={40}
                    color="#20319D"
                  />
                </View>
                <Text style={styles.emptyTitle}>No Messages Yet</Text>
                <Text style={styles.emptyText}>
                  Start a conversation by sending a message below.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
            autoCapitalize="sentences"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!messageText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  headerContainer: {
    backgroundColor: "#20319D",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    paddingTop: Platform.OS === "ios" ? 50 : StatusBar.currentHeight || 0,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerUserInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  headerRight: {
    width: 40,
  },
  chatContainer: {
    flex: 1,
    width: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 20,
    fontSize: 16,
    color: "#DC2626",
  },
  retryButton: {
    backgroundColor: "#20319D",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  messageList: {
    padding: 16,
    paddingBottom: 16,
  },
  emptyMessageList: {
    flexGrow: 1,
  },
  messageBubbleContainer: {
    flexDirection: "row",
    marginBottom: 16,
    maxWidth: "80%",
  },
  currentUserContainer: {
    alignSelf: "flex-end",
    marginLeft: "auto",
  },
  otherUserContainer: {
    alignSelf: "flex-start",
    marginRight: "auto",
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    alignSelf: "flex-end",
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    paddingBottom: 8,
    minWidth: 80,
  },
  currentUserBubble: {
    backgroundColor: "#C7D2FE", // Light indigo for current user
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    color: "#1F2937",
    marginBottom: 4,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    color: "#6B7280",
    alignSelf: "flex-end",
  },
  inputContainer: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 48,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 44,
  },
  sendButton: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#20319D",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#A1A1AA",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 21,
  },
});

export default Chat;
