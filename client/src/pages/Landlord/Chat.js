import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import useChat from "../../hooks/useChat.js";
import MessageInput from "../../components/Landlord/MessageInput.js";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import ApiHandler from "../../api/ApiHandler.js";

const Chat = () => {
  const { landlordId } = useParams(); // Get params from URL instead of route.params
  const navigate = useNavigate(); // Use navigate instead of navigation

  // These would typically come from URL params, localStorage, or context
  const [landlordName, setLandlordName] = useState("Landlord");
  const [renterName, setRenterName] = useState("You");

  const [currentUserId, setCurrentUserId] = useState(null);
  const [landlordFirebaseId, setLandlordFirebaseId] = useState(null);
  const messagesEndRef = useRef(null);

  // Generate chat ID only once we have both user IDs
  const chatId =
    currentUserId && landlordId ? `chat_${currentUserId}_${landlordId}` : null;
  const { messages, loading, error, sendNewMessage } = useChat(chatId);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Effect for scrolling when messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Fetch current user ID
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const currentUser = FIREBASE_AUTH.currentUser;
        if (currentUser) {
          const firebaseUserId = currentUser.uid;
          console.log("Firebase User ID:", firebaseUserId);
          const response = await ApiHandler.get(
            `/Users/firebase/${firebaseUserId}`
          );
          console.log("API Response:", response);
          if (response) {
            const userId = response;
            console.log("User ID retrieved:", userId);
            setCurrentUserId(userId);
          } else {
            console.log("No user data returned from the API.");
          }
        } else {
          console.log("No current user found.");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchCurrentUserId();
  }, []);

  // Fetch landlord details including name
  useEffect(() => {
    const fetchLandlordDetails = async () => {
      try {
        // Get Firebase ID
        const firebaseIdResponse = await ApiHandler.get(
          `/Users/firebaseByUserId/${landlordId}`
        );

        if (firebaseIdResponse) {
          setLandlordFirebaseId(firebaseIdResponse);
          console.log("Landlord Firebase ID:", firebaseIdResponse);
        }

        // Get landlord name - this endpoint would need to be created if it doesn't exist
        const landlordDetailsResponse = await ApiHandler.get(
          `/Users/${landlordId}`
        );
        if (landlordDetailsResponse && landlordDetailsResponse.name) {
          setLandlordName(landlordDetailsResponse.name);
        }
      } catch (error) {
        console.error("Error fetching landlord details:", error);
      }
    };

    if (landlordId) {
      fetchLandlordDetails();
    }
  }, [landlordId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center text-red-500 text-lg">Error: {error}</div>
      </div>
    );
  }

  // Handle sending messages
  const handleSendMessage = (message) => {
    if (currentUserId && landlordFirebaseId) {
      sendNewMessage({
        text: message,
        senderId: currentUserId,
        receiverId: landlordFirebaseId,
      });
    } else {
      console.error("Cannot send message: Missing user IDs");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-blue-50">
      {/* Chat Header */}
      <div className="p-4 bg-blue-500 flex items-center shadow-md">
        <button
          onClick={() => navigate(-1)}
          className="text-white hover:bg-blue-600 p-2 rounded-full transition"
        >
          <FaArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-white ml-4">
          Chat with {landlordName}
        </h2>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-auto p-4">
        {messages && messages.length > 0 ? (
          messages.map((item) => (
            <div
              key={item.id}
              className={`p-4 my-2 rounded-lg max-w-[75%] ${
                item.senderId === currentUserId
                  ? "ml-auto bg-blue-100"
                  : "mr-auto bg-gray-100"
              }`}
            >
              <p className="text-sm text-gray-800">
                <span className="font-bold">
                  {item.senderId === currentUserId ? renterName : landlordName}:
                </span>{" "}
                {typeof item.text === "object" ? item.text.text : item.text}
              </p>
              <div className="text-xs text-gray-500 mt-1 text-right">
                {item.timestamp && item.timestamp.toDate
                  ? item.timestamp.toDate().toLocaleTimeString()
                  : item.timestamp
                  ? new Date(item.timestamp).toLocaleTimeString()
                  : "Sending..."}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 mt-10">
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

export default Chat;
