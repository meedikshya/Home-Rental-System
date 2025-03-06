import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getAuth } from "firebase/auth";
import ApiHandler from "../../api/ApiHandler.js";
import useChat from "../../hooks/useChat.js";
import MessageInput from "../../components/Landlord/MessageInput.js";

const ChatPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { chatId: urlChatId } = useParams();
  const messagesEndRef = useRef(null);

  // Extract passed state from navigation
  const renterId = state?.renterId;
  const renterName = state?.renterName || "Renter";
  const landlordName = state?.landlordName || "Landlord";

  const [currentLandlordId, setCurrentLandlordId] = useState(null);
  const [currentLandlordFirebaseId, setCurrentLandlordFirebaseId] =
    useState(null);
  const [renterFirebaseId, setRenterFirebaseId] = useState(null);

  // Fetch current user (landlord) ID
  useEffect(() => {
    const fetchCurrentLandlordInfo = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          setCurrentLandlordFirebaseId(currentUser.uid);
          console.log("Current landlord Firebase ID:", currentUser.uid);

          const response = await ApiHandler.get(
            `/Users/firebase/${currentUser.uid}`
          );
          if (response) {
            setCurrentLandlordId(response);
            console.log("Current landlord database ID:", response);
          }
        } else {
          console.error("No authenticated user");
          navigate("/login");
        }
      } catch (error) {
        console.error("Error fetching landlord data:", error);
      }
    };

    fetchCurrentLandlordInfo();
  }, [navigate]);

  // Fetch renter's Firebase ID
  useEffect(() => {
    const fetchRenterFirebaseId = async () => {
      try {
        if (renterId) {
          console.log("Fetching Firebase ID for renter:", renterId);
          const response = await ApiHandler.get(
            `/Users/firebaseByUserId/${renterId}`
          );

          if (response) {
            setRenterFirebaseId(response);
            console.log("Renter Firebase ID retrieved:", response);
          } else {
            console.log("No renter Firebase ID returned from the API.");
          }
        }
      } catch (error) {
        console.error("Error fetching renter Firebase ID:", error);
      }
    };

    if (renterId) {
      fetchRenterFirebaseId();
    }
  }, [renterId]);

  // Generate chat ID using the same format as mobile app
  const chatId =
    currentLandlordId && renterId
      ? `chat_${currentLandlordId}_${renterId}`
      : null;

  // Get chat messages and functions
  const { messages, loading, error, sendNewMessage } = useChat(
    chatId,
    currentLandlordFirebaseId,
    renterFirebaseId
  );

  // Auto-scroll to latest message
  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Check if message is from current user (landlord)
  const isFromCurrentUser = (message) => {
    if (message.senderId === currentLandlordFirebaseId) return true;

    if (
      message.text &&
      typeof message.text === "object" &&
      String(message.text.senderId) === String(currentLandlordId)
    ) {
      return true;
    }

    return false;
  };

  // Extract message content from nested structure (same as mobile)
  const getMessageContent = (message) => {
    if (!message) return "";

    if (message.text && typeof message.text === "object" && message.text.text) {
      return message.text.text;
    }
    return typeof message.text === "string" ? message.text : "";
  };

  // Send message handler
  const handleSendMessage = (message) => {
    if (!chatId || !currentLandlordId || !renterFirebaseId) {
      console.error("Missing required information to send message");
      return;
    }

    console.log("Sending message with:", {
      chatId,
      currentLandlordId,
      renterFirebaseId,
    });

    // Use the same message structure as mobile
    sendNewMessage({
      text: message,
      senderId: currentLandlordId,
      receiverId: renterFirebaseId,
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center text-red-500 text-lg p-4">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-blue-50">
      {/* Chat Header - styled similar to mobile */}
      <div className="p-4 bg-blue-500 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="text-white flex items-center"
        >
          <span className="text-xl mr-2">←</span> Back
        </button>
        <h2 className="text-2xl font-bold text-white ml-4">
          Chat with {renterName}
        </h2>
      </div>

      {/* Messages List - styled similar to mobile with web adaptations */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages && messages.length > 0 ? (
          messages.map((item) => (
            <div
              key={item.id}
              className={`p-4 my-2 rounded-lg max-w-[75%] ${
                isFromCurrentUser(item)
                  ? "ml-auto bg-blue-100 text-blue-900"
                  : "mr-auto bg-gray-100 text-gray-900"
              }`}
            >
              <p className="text-sm">
                <span className="font-medium">
                  {isFromCurrentUser(item) ? "You" : renterName}:
                </span>{" "}
                {getMessageContent(item)}
              </p>

              <p className="text-xs text-right mt-1 text-gray-500">
                {item.timestamp?.toDate
                  ? item.timestamp.toDate().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Just now"}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 mt-20">
            No messages yet. Start the conversation!
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
