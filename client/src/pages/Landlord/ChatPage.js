import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getAuth } from "firebase/auth";
import ApiHandler from "../../api/ApiHandler.js";
import {
  findMessagesBetweenUsers,
  sendMessage,
} from "../../services/Firebase-config.js";
import { sendNotificationToUser } from "../../services/Firebase-notification.js";
import { getUserDataFromFirebaseId } from "../../context/AuthContext.js";
import {
  FiArrowLeft,
  FiMessageSquare,
  FiSend,
  FiInfo,
  FiRefreshCw,
  FiUser,
  FiCheck,
  FiClock,
  FiAlertCircle,
} from "react-icons/fi";

const ChatPage = () => {
  // Get parameters from navigation state
  const { state } = useLocation();
  const params = useParams();
  const chatId = params.chatId;

  const renterId = state?.renterId || (chatId ? chatId.split("_")[2] : null);
  const renterName = state?.renterName || "Renter";
  const initialRenterFirebaseId = state?.renterFirebaseId || null;
  const previewData = state?.previewData || null;

  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);

  // States
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserFirebaseId, setCurrentUserFirebaseId] = useState(null);
  const [renterFirebaseId, setRenterFirebaseId] = useState(
    initialRenterFirebaseId
  );
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [initialScrollDone, setInitialScrollDone] = useState(false);

  // Use preview data while loading
  useEffect(() => {
    if (
      previewData &&
      loading &&
      messages.length === 0 &&
      previewData.lastMessage
    ) {
      const previewMessage = {
        id: "preview",
        text: previewData.lastMessage,
        timestamp: previewData.timestamp || { seconds: Date.now() / 1000 },
        senderId: previewData.firebaseId,
        senderEmail: previewData.fullName,
        isPreview: true,
      };
      setMessages([previewMessage]);
    }
  }, [previewData, loading, messages.length]);

  // Fetch current user ID
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          const firebaseUserId = currentUser.uid;
          setCurrentUserFirebaseId(firebaseUserId);

          const response = await ApiHandler.get(
            `/Users/firebase/${firebaseUserId}`
          );
          if (response) {
            setCurrentUserId(response);
          }
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to fetch user data");
      }
    };
    fetchCurrentUserId();
  }, [navigate]);

  // Fetch renter's Firebase ID if not provided
  useEffect(() => {
    const fetchRenterFirebaseId = async () => {
      if (initialRenterFirebaseId || !renterId) return;

      try {
        const response = await ApiHandler.get(
          `/Users/firebaseByUserId/${renterId}`
        );
        if (response) {
          setRenterFirebaseId(response);
        }
      } catch (error) {
        console.error("Error fetching renter data:", error);
        setError("Failed to fetch renter data");
      }
    };
    fetchRenterFirebaseId();
  }, [renterId, initialRenterFirebaseId]);

  // Generate chat ID for sending messages
  const generatedChatId =
    currentUserId && renterId ? `chat_${currentUserId}_${renterId}` : null;

  // Fetch messages once we have both user IDs
  useEffect(() => {
    if (!currentUserFirebaseId || !renterFirebaseId) return;

    setLoading(true);

    findMessagesBetweenUsers(currentUserFirebaseId, renterFirebaseId)
      .then((fetchedMessages) => {
        if (fetchedMessages && fetchedMessages.length > 0) {
          setMessages(fetchedMessages);
        }
        setLoading(false);
        setInitialScrollDone(false); // Reset scroll flag when new messages arrive
      })
      .catch((err) => {
        console.error("Error in direct message fetching:", err);
        setError("Failed to load messages");
        setLoading(false);
      });
  }, [currentUserFirebaseId, renterFirebaseId]);

  // Handle smooth scrolling to bottom with better controls
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current && !initialScrollDone) {
      // Use a small timeout to ensure the DOM is fully rendered
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        setInitialScrollDone(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, initialScrollDone]);

  // Check if a message is from current user
  const isFromCurrentUser = (message) => {
    if (!message || !currentUserFirebaseId) return false;

    if (message.senderId === currentUserFirebaseId) return true;

    if (message.text && typeof message.text === "object") {
      if (
        String(message.text.senderId) === String(currentUserId) ||
        message.text.senderId === currentUserFirebaseId
      ) {
        return true;
      }
    }

    return false;
  };

  // Extract message text
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

  // Format timestamp
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";

    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp.seconds * 1000);

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
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  // Send a new message
  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;
    if (!generatedChatId || !currentUserFirebaseId || !renterFirebaseId) {
      setError("Cannot send message: Missing required IDs");
      return;
    }

    setSending(true);

    try {
      // Add a temporary message to UI for better UX
      const tempId = `temp_${Date.now()}`;
      const tempMessage = {
        id: tempId,
        text: messageText,
        senderId: currentUserFirebaseId,
        senderEmail: getAuth().currentUser?.email || "",
        timestamp: { seconds: Math.floor(Date.now() / 1000) },
        isPending: true,
      };

      setMessages((prev) => [...prev, tempMessage]);

      // Scroll after adding a new message (use auto instead of smooth to prevent jitter)
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 10);

      // Create message data object
      const messageData = {
        text: messageText,
        senderId: currentUserFirebaseId,
        senderEmail: getAuth().currentUser?.email || "",
        receiverId: renterFirebaseId,
        timestamp: new Date(),
      };

      // Send the message
      await sendMessage(generatedChatId, messageData, currentUserFirebaseId);

      // Update UI to show message sent
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, isPending: false } : msg
        )
      );

      // Send notification to receiver
      try {
        const receiverId = renterFirebaseId;

        const notificationTitle = "New Message";
        const notificationBody = `You have a new message from ${
          getAuth().currentUser?.email || "a user"
        }`;

        // Additional data
        const additionalData = {
          chatId: generatedChatId,
          senderId: currentUserFirebaseId,
          receiverId: receiverId,
          screen: "Chat",
          action: "view_chat",
          timestamp: new Date().toISOString(),
        };

        // Send notification
        await sendNotificationToUser(
          receiverId,
          notificationTitle,
          notificationBody,
          additionalData
        );
      } catch (notificationError) {
        console.error("Error sending message notification:", notificationError);
      }

      // After sending, refresh messages
      setTimeout(async () => {
        if (currentUserFirebaseId && renterFirebaseId) {
          const updatedMessages = await findMessagesBetweenUsers(
            currentUserFirebaseId,
            renterFirebaseId
          );

          if (updatedMessages && updatedMessages.length > 0) {
            setMessages(updatedMessages);

            // Use auto scrolling (not smooth) to prevent jitter
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
            }, 10);
          }
        }
        setSending(false);
      }, 500);

      // Clear the input field
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");

      // Update UI to show message failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id.startsWith("temp_")
            ? { ...msg, isPending: false, failed: true }
            : msg
        )
      );
      setSending(false);
    }
  };

  // Send a test message
  const sendTestMessage = () => {
    const testMessage = `Hello! This is a test message sent at ${new Date().toLocaleTimeString()}`;
    handleSendMessage(testMessage);
  };

  // Force refresh messages
  const handleForceRefresh = () => {
    if (currentUserFirebaseId && renterFirebaseId) {
      setLoading(true);
      findMessagesBetweenUsers(currentUserFirebaseId, renterFirebaseId)
        .then((fetchedMessages) => {
          setMessages(fetchedMessages);
          setLoading(false);
          setError(null);
          setInitialScrollDone(false);
        })
        .catch(() => {
          setError("Failed to refresh messages");
          setLoading(false);
        });
    }
  };

  // Handle form submission for new messages
  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(newMessage);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header - fixed height to prevent layout shift */}
      <div className="mb-6 bg-[#20319D] text-white p-6 h-[84px] rounded-lg shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate("/landlord/chat")}
              className="flex items-center justify-center p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors mr-3"
              aria-label="Back to chats"
            >
              <FiArrowLeft className="text-white text-lg" />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center">
                <FiMessageSquare className="mr-2" /> Conversation with{" "}
                {renterName}
              </h1>
            </div>
          </div>

          <button
            onClick={handleForceRefresh}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Refresh messages"
            title="Refresh messages"
          >
            <FiRefreshCw className="text-white" />
          </button>
        </div>
      </div>

      {/* Error banner with fixed height */}
      <div className="h-[40px] mb-2">
        {error && (
          <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-red-700 flex items-center justify-between">
            <p className="flex items-center text-sm">
              <FiAlertCircle className="mr-2" /> {error}
            </p>
            <button
              onClick={handleForceRefresh}
              className="text-red-700 underline text-sm flex items-center"
            >
              <FiRefreshCw className="mr-1" /> Retry
            </button>
          </div>
        )}
      </div>

      {/* Chat container with fixed height to prevent jumps */}
      <div
        className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col"
        style={{ height: "calc(100vh - 208px)" }}
      >
        {/* Chat header with user info - fixed height */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center h-[64px]">
          <div className="h-10 w-10 rounded-full bg-[#20319D]/10 flex items-center justify-center">
            <FiUser className="text-[#20319D]" />
          </div>
          <div className="ml-3">
            <div className="font-medium text-gray-900">{renterName}</div>
            <div className="text-xs text-gray-500">
              {previewData?.timestamp
                ? `Last active: ${formatMessageTime(previewData.timestamp)}`
                : "Tenant"}
            </div>
          </div>
        </div>

        {/* Message list container - scrollable area */}
        <div
          ref={messageListRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
          style={{ minHeight: "200px" }}
        >
          {loading && messages.length === 0 ? (
            // Fixed height loading skeleton to avoid layout shift
            <div className="flex flex-col space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex ${
                    i % 2 === 0 ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl h-[60px] ${
                      i % 2 === 0 ? "w-64 bg-blue-100" : "w-72 bg-gray-100"
                    }`}
                  >
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length > 0 ? (
            // Actual messages with stabilized layout
            messages.map((message, index) => {
              const fromCurrentUser = isFromCurrentUser(message);
              return (
                <div
                  key={message.id || `msg-${index}`}
                  className={`flex ${
                    fromCurrentUser ? "justify-end" : "justify-start"
                  } ${message.isPreview ? "opacity-60" : ""}`}
                >
                  <div
                    className={`p-3 rounded-2xl max-w-[80%] shadow-sm ${
                      message.isPending ? "opacity-80" : ""
                    } ${message.failed ? "opacity-70" : ""} ${
                      fromCurrentUser
                        ? "bg-[#20319D] text-white rounded-br-none"
                        : "bg-white border border-gray-200 rounded-bl-none"
                    }`}
                  >
                    {/* Message content */}
                    <p className="text-sm leading-relaxed">
                      {getMessageText(message)}
                    </p>

                    {/* Message metadata with fixed height to prevent jumping */}
                    <div className="flex justify-end items-center mt-1 gap-1 h-[16px]">
                      {message.failed && (
                        <span className="text-xs text-red-300 flex items-center">
                          <FiAlertCircle className="mr-1 text-xs" /> Failed
                        </span>
                      )}
                      {message.isPending && (
                        <span className="text-xs text-blue-100 flex items-center">
                          <FiClock className="mr-1 text-xs" /> Sending
                        </span>
                      )}
                      <span
                        className={`text-xs ${
                          fromCurrentUser ? "text-blue-100" : "text-gray-500"
                        }`}
                      >
                        {message.isPreview
                          ? "Loading..."
                          : message.timestamp?.toDate
                          ? formatMessageTime(message.timestamp)
                          : message.timestamp?.seconds
                          ? formatMessageTime(message.timestamp)
                          : "Just now"}
                      </span>

                      {fromCurrentUser &&
                        !message.isPending &&
                        !message.failed && (
                          <FiCheck
                            className={`text-xs ${
                              fromCurrentUser
                                ? "text-blue-100"
                                : "text-gray-400"
                            } ml-1`}
                          />
                        )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // Empty state with fixed height
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <div className="h-16 w-16 rounded-full bg-[#20319D]/10 flex items-center justify-center mb-4">
                <FiMessageSquare className="text-[#20319D] text-2xl" />
              </div>
              <p className="mb-4 text-gray-600">
                No messages yet. Start the conversation!
              </p>
              <button
                onClick={sendTestMessage}
                className="bg-[#20319D] hover:bg-blue-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <FiSend className="mr-2" /> Send First Message
              </button>
            </div>
          )}
          {/* Invisible element for scrolling to bottom */}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input with fixed height */}
        <div className="p-4 bg-white border-t border-gray-200 h-[72px]">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#20319D] focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className={`w-10 h-10 rounded-lg ${
                sending || !newMessage.trim()
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-[#20319D] text-white hover:bg-blue-800"
              } transition-colors flex items-center justify-center`}
            >
              {sending ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <FiSend />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
