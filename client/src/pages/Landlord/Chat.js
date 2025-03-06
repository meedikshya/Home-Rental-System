import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getAssociatedUsers } from "../../services/Firebase-config.js";
import { getUserDataFromFirebaseId } from "../../context/AuthContext.js";
import ApiHandler from "../../api/ApiHandler.js";

const ChatList = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [chatUsers, setChatUsers] = useState([]);
  const [renterName, setRenterName] = useState("");
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

  const fetchRenterName = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const userId = await getUserDataFromFirebaseId(currentUserId);
      if (!userId) return;
      const response = await ApiHandler.get(`/UserDetails/userId/${userId}`);
      if (response) {
        const { firstName, lastName } = response;
        setRenterName(`${firstName} ${lastName}`);
      }
    } catch (error) {
      console.error("Error fetching renter's full name:", error);
    }
  }, [currentUserId]);

  const fetchChatUsers = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const associatedFirebaseIds = await getAssociatedUsers(currentUserId);
      if (!associatedFirebaseIds || associatedFirebaseIds.length === 0) {
        setChatUsers([]);
        return;
      }

      const usersWithIds = await Promise.all(
        associatedFirebaseIds.map(async (firebaseId) => {
          try {
            const userId = await getUserDataFromFirebaseId(firebaseId);
            if (!userId) return null;
            const userDetailsResponse = await ApiHandler.get(
              `/UserDetails/userId/${userId}`
            );
            let fullName = "";
            if (userDetailsResponse) {
              const { firstName, lastName } = userDetailsResponse;
              fullName = `${firstName} ${lastName}`;
            }
            return { firebaseId, userId, fullName };
          } catch (error) {
            console.error(`Error converting Firebase ID ${firebaseId}:`, error);
            return null;
          }
        })
      );
      setChatUsers(usersWithIds.filter(Boolean));
    } catch (error) {
      console.error("Error fetching chat users:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchRenterName();
    fetchChatUsers();
  }, [fetchRenterName, fetchChatUsers]);

  // Update the handleUserClick function to use a consistent format

  const handleUserClick = (user) => {
    // Use the "chat_userId_userId" format consistently
    const chatId = `chat_${currentUserId}_${user.userId}`;

    navigate(`/landlord/chat/${chatId}`, {
      state: {
        renterId: user.userId,
        renterName: user.fullName,
        landlordName: renterName,
        currentLandlordId: currentUserId,
      },
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold text-center mb-6 text-blue-800">
        Chats
      </h2>
      {loading ? (
        <p className="text-center text-blue-600">Loading...</p>
      ) : chatUsers.length > 0 ? (
        <ul className="space-y-4">
          {chatUsers.map((item) => (
            <li
              key={item.firebaseId || Math.random().toString()}
              className="flex items-center bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-800 cursor-pointer hover:bg-gray-100"
              onClick={() => handleUserClick(item)}
            >
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                  item.fullName || "User"
                )}&background=1DA1F2&color=fff`}
                alt="User Avatar"
                className="w-12 h-12 rounded-full"
              />
              <div className="ml-4">
                <p className="text-lg font-semibold text-blue-800">
                  {item.fullName || "Unknown User"}
                </p>
                <p className="text-sm text-blue-600">User ID: {item.userId}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-lg text-blue-800 mt-8">
          No recent chats found.
        </p>
      )}
    </div>
  );
};

export default ChatList;
