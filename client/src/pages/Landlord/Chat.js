import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  getAssociatedUsers,
  findMessagesBetweenUsers,
} from "../../services/Firebase-config.js";
import { getUserDataFromFirebaseId } from "../../context/AuthContext.js";
import ApiHandler from "../../api/ApiHandler.js";

const ChatList = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [chatUsers, setChatUsers] = useState([]);
  const [landlordName, setLandlordName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser) {
      setCurrentUserId(currentUser.uid);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchLandlordName = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const userId = await getUserDataFromFirebaseId(currentUserId);
      if (!userId) return;
      const response = await ApiHandler.get(`/UserDetails/userId/${userId}`);
      if (response) {
        const { firstName, lastName } = response;
        setLandlordName(`${firstName} ${lastName}`);
      }
    } catch (error) {
      // Handle error silently
    }
  }, [currentUserId]);

  const fetchChatUsers = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const associatedFirebaseIds = await getAssociatedUsers(currentUserId);

      if (!associatedFirebaseIds || associatedFirebaseIds.length === 0) {
        setChatUsers([]);
        setLoading(false);
        return;
      }

      const usersWithDetails = await Promise.all(
        associatedFirebaseIds.map(async (firebaseId) => {
          try {
            const userId = await getUserDataFromFirebaseId(firebaseId);
            if (!userId) return null;

            const userDetails = await ApiHandler.get(
              `/UserDetails/userId/${userId}`
            );

            let fullName = "Unknown User";
            if (userDetails) {
              const { firstName, lastName } = userDetails;
              fullName = `${firstName} ${lastName}`;
            }

            const messages = await findMessagesBetweenUsers(
              currentUserId,
              firebaseId
            );

            let lastMessage = "No messages";
            let timestamp = null;

            if (messages && messages.length > 0) {
              const latestMessage = messages[messages.length - 1];

              if (
                latestMessage.text &&
                typeof latestMessage.text === "object" &&
                latestMessage.text.text
              ) {
                lastMessage = latestMessage.text.text;
              } else if (typeof latestMessage.text === "string") {
                lastMessage = latestMessage.text;
              }

              timestamp = latestMessage.timestamp;
            }

            return {
              firebaseId,
              userId,
              fullName,
              lastMessage,
              timestamp,
              messageCount: messages.length,
            };
          } catch (error) {
            return null;
          }
        })
      );

      const validUsers = usersWithDetails.filter(Boolean);
      validUsers.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return b.timestamp.seconds - a.timestamp.seconds;
      });

      setChatUsers(validUsers);
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      fetchLandlordName();
      fetchChatUsers();
    }
  }, [currentUserId, fetchLandlordName, fetchChatUsers]);

  const handleUserClick = async (user) => {
    try {
      const landlordDbId = await getUserDataFromFirebaseId(currentUserId);
      if (!landlordDbId) {
        return;
      }

      const chatId = `chat_${landlordDbId}_${user.userId}`;

      navigate(`/landlord/chat/${chatId}`, {
        state: {
          renterId: user.userId,
          renterName: user.fullName,
          renterFirebaseId: user.firebaseId,
          landlordName: landlordName,
          lastMessage: user.lastMessage,
          messageCount: user.messageCount,
          timestamp: user.timestamp,
          previewData: {
            ...user,
            timestamp: user.timestamp
              ? {
                  seconds: user.timestamp.seconds,
                  nanoseconds: user.timestamp.nanoseconds,
                }
              : null,
          },
        },
      });
    } catch (error) {
      // Handle error silently
    }
  };

  return (
    <div className="flex-1 bg-blue-50 p-4 flex flex-col min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-800">Chats</h2>
      </div>

      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : chatUsers.length > 0 ? (
        <ul className="space-y-4 mb-4">
          {chatUsers.map((user) => (
            <li
              key={user.firebaseId}
              className="flex items-center bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500 cursor-pointer hover:bg-blue-50 transition"
              onClick={() => handleUserClick(user)}
            >
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {user.fullName.charAt(0)}
              </div>

              <div className="ml-4 flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-blue-800">
                    {user.fullName}
                  </h3>
                  {user.timestamp && (
                    <span className="text-xs text-gray-500">
                      {new Date(user.timestamp.seconds * 1000).toLocaleString(
                        [],
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 truncate mt-1">
                  {user.lastMessage}
                </p>

                {user.messageCount > 0 && (
                  <div className="mt-1">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      {user.messageCount} message
                      {user.messageCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2 text-blue-800">
              No chats found
            </h3>
            <p className="text-gray-600">
              Your conversations with tenants will appear here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatList;
