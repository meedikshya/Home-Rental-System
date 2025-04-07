import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  getAssociatedUsers,
  findMessagesBetweenUsers,
} from "../../services/Firebase-config.js";
import { getUserDataFromFirebaseId } from "../../context/AuthContext.js";
import ApiHandler from "../../api/ApiHandler.js";
import {
  FiMessageSquare,
  FiUser,
  FiSearch,
  FiCalendar,
  FiInfo,
  FiRefreshCw,
  FiMessageCircle,
  FiX,
} from "react-icons/fi";

// Create a cache for user details to avoid repeated API calls
const userCache = {};
const messageCache = {};

const ChatList = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [chatUsers, setChatUsers] = useState([]);
  const [landlordName, setLandlordName] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Check if user is authenticated immediately
  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser) {
      setCurrentUserId(currentUser.uid);
    } else {
      setLoading(false);
      setInitialLoad(false);
      setError("User not authenticated");
    }
  }, []);

  // Cancel previous requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Initial load - fetch landlord name and first few chat users
  useEffect(() => {
    if (!currentUserId) return;

    // Create a new abort controller for this request session
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const quickLoad = async () => {
      try {
        // Start fetching landlord name
        fetchLandlordName(currentUserId).catch((err) =>
          console.error("Error fetching landlord name:", err)
        );

        // Quick load the first few users
        const associatedIds = await getAssociatedUsers(currentUserId);

        if (!associatedIds || associatedIds.length === 0) {
          setChatUsers([]);
          setLoading(false);
          setInitialLoad(false);
          return;
        }

        // Just load the first 3 conversations immediately
        const initialIds = associatedIds.slice(0, 3);
        const initialUsers = await Promise.all(
          initialIds.map((id) => loadSingleUser(currentUserId, id, signal))
        );

        const validUsers = initialUsers.filter(Boolean);
        setChatUsers(validUsers);

        // Show first results very quickly
        setInitialLoad(false);

        // Then load the rest in the background
        if (associatedIds.length > 3) {
          setTimeout(() => {
            loadRemainingUsers(currentUserId, associatedIds.slice(3), signal);
          }, 100);
        } else {
          setLoading(false);
        }
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("Fetch aborted");
        } else {
          console.error("Error in quick load:", error);
          setError("Failed to load conversations");
          setInitialLoad(false);
          setLoading(false);
        }
      }
    };

    quickLoad();
  }, [currentUserId]);

  // Load a single user's data (with caching)
  const loadSingleUser = async (currentId, firebaseId, signal) => {
    try {
      // Check cache first for user ID
      let userId;
      if (userCache[firebaseId]?.userId) {
        userId = userCache[firebaseId].userId;
      } else {
        userId = await getUserDataFromFirebaseId(firebaseId);
        if (!userId) return null;
      }

      // Check cache for user details
      let userDetails;
      if (userCache[firebaseId]?.details) {
        userDetails = userCache[firebaseId].details;
      } else {
        // Fetch user details
        userDetails = await ApiHandler.get(`/UserDetails/userId/${userId}`);
        if (!userDetails) return null;

        // Store in cache
        userCache[firebaseId] = {
          ...(userCache[firebaseId] || {}),
          userId,
          details: userDetails,
        };
      }

      // Get message preview (check cache first)
      let messagePreview;
      const cacheKey = `${currentId}-${firebaseId}`;
      if (messageCache[cacheKey]) {
        messagePreview = messageCache[cacheKey];
      } else {
        // Instead of waiting for actual messages, provide a placeholder first
        messagePreview = {
          message: "Loading messages...",
          timestamp: null,
          count: 0,
        };

        // Fetch actual messages in the background
        getLastMessageOnly(currentId, firebaseId)
          .then((preview) => {
            messageCache[cacheKey] = preview;

            // Update this specific user without re-rendering all users
            setChatUsers((prevUsers) => {
              const updatedUsers = [...prevUsers];
              const userIndex = updatedUsers.findIndex(
                (u) => u.firebaseId === firebaseId
              );

              if (userIndex !== -1) {
                updatedUsers[userIndex] = {
                  ...updatedUsers[userIndex],
                  lastMessage: preview.message || "No messages",
                  timestamp: preview.timestamp,
                  messageCount: preview.count || 0,
                };
              }

              // Sort users by timestamp
              return updatedUsers.sort((a, b) => {
                if (!a.timestamp) return 1;
                if (!b.timestamp) return -1;
                return b.timestamp.seconds - a.timestamp.seconds;
              });
            });
          })
          .catch((err) =>
            console.error("Error fetching message preview:", err)
          );
      }

      const { firstName, lastName } = userDetails;

      return {
        firebaseId,
        userId,
        fullName: `${firstName} ${lastName}`,
        lastMessage: messagePreview.message || "No messages",
        timestamp: messagePreview.timestamp,
        messageCount: messagePreview.count || 0,
      };
    } catch (error) {
      console.error(`Error loading data for user ${firebaseId}:`, error);
      return null;
    }
  };

  // Load remaining users in the background
  const loadRemainingUsers = async (currentId, remainingIds, signal) => {
    try {
      const batchSize = 3;

      for (let i = 0; i < remainingIds.length; i += batchSize) {
        if (signal.aborted) return;

        const batch = remainingIds.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((id) => loadSingleUser(currentId, id, signal))
        );

        const validResults = batchResults.filter(Boolean);

        if (validResults.length > 0) {
          setChatUsers((prevUsers) => {
            // Combine new users with existing ones and remove duplicates
            const combined = [...prevUsers];

            for (const user of validResults) {
              if (!combined.find((u) => u.firebaseId === user.firebaseId)) {
                combined.push(user);
              }
            }

            // Sort by timestamp
            return combined.sort((a, b) => {
              if (!a.timestamp) return 1;
              if (!b.timestamp) return -1;
              return b.timestamp.seconds - a.timestamp.seconds;
            });
          });
        }

        // Small delay to prevent UI freezing
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error("Error loading remaining users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Separate function to fetch landlord name
  const fetchLandlordName = async (firebaseId) => {
    try {
      // Check cache first
      if (userCache[firebaseId]?.userId && userCache[firebaseId]?.details) {
        const { firstName, lastName } = userCache[firebaseId].details;
        setLandlordName(`${firstName} ${lastName}`);
        return;
      }

      const userId = await getUserDataFromFirebaseId(firebaseId);
      if (!userId) return;

      const response = await ApiHandler.get(`/UserDetails/userId/${userId}`);
      if (response) {
        const { firstName, lastName } = response;
        setLandlordName(`${firstName} ${lastName}`);

        // Cache the response
        userCache[firebaseId] = {
          ...(userCache[firebaseId] || {}),
          userId,
          details: response,
        };
      }
    } catch (error) {
      console.error("Error fetching landlord name:", error);
    }
  };

  // Helper function to get only the last message
  const getLastMessageOnly = async (currentId, targetId) => {
    try {
      const messages = await findMessagesBetweenUsers(currentId, targetId, 1);

      if (!messages || messages.length === 0) {
        return { message: "No messages", timestamp: null, count: 0 };
      }

      const lastMessage = messages[messages.length - 1];
      let messageText = "No message content";

      if (
        lastMessage.text &&
        typeof lastMessage.text === "object" &&
        lastMessage.text.text
      ) {
        messageText = lastMessage.text.text;
      } else if (typeof lastMessage.text === "string") {
        messageText = lastMessage.text;
      }

      return {
        message: messageText,
        timestamp: lastMessage.timestamp,
        count: messages.length,
      };
    } catch (error) {
      console.error("Error getting last message:", error);
      return { message: "Error loading message", timestamp: null, count: 0 };
    }
  };

  const handleUserClick = async (user) => {
    try {
      let landlordDbId;

      // Use cached user ID if available
      if (userCache[currentUserId]?.userId) {
        landlordDbId = userCache[currentUserId].userId;
      } else {
        landlordDbId = await getUserDataFromFirebaseId(currentUserId);
        if (!landlordDbId) return;
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
      console.error("Error navigating to chat:", error);
    }
  };

  // Filter chats based on search term
  const filteredChats = searchTerm
    ? chatUsers.filter((user) =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : chatUsers;

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp.seconds * 1000);
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
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-red-700 my-4 shadow-sm">
          <p className="flex items-center text-lg font-medium mb-2">
            <FiInfo className="mr-2" /> Error
          </p>
          <p className="mb-4">{error}</p>
          <button
            className="px-4 py-2 bg-[#20319D] text-white rounded-md hover:bg-blue-800 transition-colors shadow-sm flex items-center"
            onClick={() => window.location.reload()}
          >
            <FiRefreshCw className="mr-2" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show a faster initial loading state
  if (initialLoad) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="mb-6 bg-[#20319D] text-white p-6 rounded-lg shadow-md">
          <div className="h-7 w-52 bg-white/30 rounded-md animate-pulse mb-2"></div>
          <div className="h-5 w-96 bg-white/20 rounded-md animate-pulse"></div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          {/* Skeleton loaders instead of spinner */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center p-4 border-b border-gray-100"
            >
              <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="ml-4 flex-1">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 bg-[#20319D] text-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div className="mb-4 md:mb-0">
            <h1 className="text-xl font-bold mb-2 flex items-center">
              <FiMessageSquare className="mr-2" /> Message Center
            </h1>
          </div>

          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-blue-300" />
            </div>
            <input
              type="text"
              className="pl-10 pr-4 py-2 w-full border border-blue-400 bg-white/10 text-white placeholder-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white/20"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Chat content */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {chatUsers.length === 0 && loading ? (
          <div className="flex flex-col items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#20319D]"></div>
            <p className="text-gray-600 mt-4">Loading conversations...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-16">
            <FiMessageCircle className="mx-auto text-gray-400 text-5xl mb-3" />
            <h3 className="text-xl font-medium text-gray-600 mb-2">
              No Conversations Found
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? "No contacts match your search."
                : "Your conversations with tenants will appear here."}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 px-4 py-2 bg-[#20319D] text-white rounded-md hover:bg-blue-800 transition-colors flex items-center mx-auto"
              >
                <FiX className="mr-2" /> Clear Search
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Show incremental loading indicator if there are users but still loading more */}
            {loading && chatUsers.length > 0 && (
              <div className="p-2 bg-blue-50 text-center text-sm text-blue-800">
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-blue-500 rounded-full mr-2"></div>
                  Loading more conversations...
                </div>
              </div>
            )}
            <ul className="divide-y divide-gray-200">
              {filteredChats.map((user) => (
                <li
                  key={user.firebaseId}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleUserClick(user)}
                >
                  <div className="px-6 py-4 flex items-center">
                    <div className="h-12 w-12 rounded-full bg-[#20319D]/10 flex items-center justify-center">
                      <FiUser className="text-[#20319D] text-lg" />
                    </div>

                    <div className="ml-4 flex-1">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-gray-900">
                          {user.fullName}
                        </h3>
                        {user.timestamp && (
                          <span className="text-xs text-gray-500 flex items-center">
                            <FiCalendar className="mr-1" />
                            {formatDate(user.timestamp)}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-1">
                        <p className="text-sm text-gray-600 truncate max-w-xs">
                          {user.lastMessage}
                        </p>

                        {user.messageCount > 0 && (
                          <span className="bg-[#20319D] text-white text-xs px-2 py-0.5 rounded-full">
                            {user.messageCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
