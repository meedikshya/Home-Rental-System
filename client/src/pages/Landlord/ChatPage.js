import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getAuth } from "firebase/auth";
import ApiHandler from "../../api/ApiHandler.js";
import MessageInput from "../../components/Landlord/MessageInput.js";
import {
  findMessagesBetweenUsers,
  sendMessage,
} from "../../services/Firebase-config.js";

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

  // States
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserFirebaseId, setCurrentUserFirebaseId] = useState(null);
  const [renterFirebaseId, setRenterFirebaseId] = useState(
    initialRenterFirebaseId
  );

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
        setMessages(fetchedMessages);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load messages");
        setLoading(false);
      });
  }, [currentUserFirebaseId, renterFirebaseId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  // Send a new message
  const handleSendMessage = (message) => {
    if (!currentUserId || !renterFirebaseId || !generatedChatId) {
      setError("Cannot send message: Missing user IDs");
      return;
    }

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const senderEmail = currentUser ? currentUser.email : null;
      const tempId = `local_${Date.now()}`;

      // Create message object
      const messageData = {
        text: message,
        senderId: currentUserFirebaseId,
        senderEmail: senderEmail,
        receiverId: renterFirebaseId,
        timestamp: new Date(),
      };

      // Immediately add to UI with pending status
      const localMessage = {
        id: tempId,
        ...messageData,
        timestamp: {
          seconds: Math.floor(Date.now() / 1000),
          nanoseconds: 0,
        },
        isPending: true,
      };

      setMessages((prevMessages) => [...prevMessages, localMessage]);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);

      // Send to Firebase
      sendMessage(generatedChatId, messageData, currentUserFirebaseId)
        .then(() => {
          // Update pending status
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === tempId ? { ...msg, isPending: false } : msg
            )
          );

          // Refresh messages after a delay
          setTimeout(() => {
            findMessagesBetweenUsers(
              currentUserFirebaseId,
              renterFirebaseId
            ).then((updatedMessages) => {
              setMessages(updatedMessages);
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 50);
            });
          }, 300);
        })
        .catch((err) => {
          // Mark message as failed
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === tempId
                ? { ...msg, isPending: false, failed: true }
                : msg
            )
          );
          setError("Failed to send message");
        });
    } catch (error) {
      setError("Failed to process message");
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
        })
        .catch(() => {
          setError("Failed to refresh messages");
          setLoading(false);
        });
    }
  };

  // Loading state
  if (loading && !previewData && messages.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // Error state
  if (error && messages.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center text-red-500 p-4">
          <p className="text-lg font-bold mb-2">Error</p>
          <p>{error}</p>
          <button
            onClick={handleForceRefresh}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-blue-50">
      {/* Chat Header */}
      <div className="p-4 bg-blue-500 flex items-center">
        <button
          onClick={() => navigate("/landlord/chat")}
          className="text-white flex items-center"
        >
          <span className="text-xl mr-2">←</span> Back
        </button>
        <h2 className="text-2xl font-bold text-white ml-4">
          Chat with {renterName}
        </h2>
      </div>

      {/* Message count summary */}
      {previewData && previewData.messageCount > 0 && (
        <div className="bg-white p-2 border-b border-gray-200">
          <p className="text-sm text-center text-gray-600">
            {previewData.messageCount} message
            {previewData.messageCount !== 1 ? "s" : ""} in this conversation
          </p>
        </div>
      )}

      {/* Error message (if any) */}
      {error && (
        <div className="bg-red-100 text-red-700 p-2 text-sm text-center">
          {error}{" "}
          <button onClick={handleForceRefresh} className="underline">
            Retry
          </button>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages && messages.length > 0 ? (
          messages.map((message, index) => (
            <div
              key={message.id || `msg-${index}`}
              className={`p-3 rounded-lg ${
                message.isPreview ? "opacity-60 " : ""
              }${message.isPending ? "opacity-75 " : ""}${
                message.failed ? "opacity-50 " : ""
              }${
                isFromCurrentUser(message)
                  ? "ml-auto bg-blue-100 text-blue-900 max-w-[75%]"
                  : "mr-auto bg-white text-gray-900 border border-gray-200 max-w-[75%]"
              }`}
            >
              {/* Message content */}
              <p className="text-sm">{getMessageText(message)}</p>

              {/* Message metadata with status indicators */}
              <div className="flex justify-between items-center mt-1">
                {message.senderEmail && (
                  <span className="text-xs text-gray-500">
                    {message.senderEmail}
                  </span>
                )}
                <span className="text-xs text-gray-500 ml-auto flex items-center">
                  {message.failed && (
                    <span className="mr-1 text-red-500">Failed</span>
                  )}
                  {message.isPending && (
                    <span className="mr-1 flex items-center">
                      <svg
                        className="animate-spin h-3 w-3 text-blue-500 mr-1"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending...
                    </span>
                  )}
                  {message.isPreview
                    ? "Loading..."
                    : message.timestamp?.toDate
                    ? message.timestamp.toDate().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : message.timestamp?.seconds
                    ? new Date(
                        message.timestamp.seconds * 1000
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Just now"}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p className="mb-4">No messages yet.</p>
            <button
              onClick={sendTestMessage}
              className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
            >
              Send First Message
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ChatPage;
