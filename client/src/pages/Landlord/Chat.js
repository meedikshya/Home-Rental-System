import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
  FiMessageCircle,
  FiX,
} from "react-icons/fi";

const userCache = {};
const messageCache = {};
const idMappingCache = {};

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

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log("Current user found with Firebase ID:", currentUser.uid);
      setCurrentUserId(currentUser.uid);
    } else {
      console.log("No authenticated user found");
      setLoading(false);
      setInitialLoad(false);
      setError("User not authenticated");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  const resolveUserId = async (firebaseId) => {
    if (idMappingCache[firebaseId]) {
      console.log(
        `Using cached user ID ${idMappingCache[firebaseId]} for Firebase ID ${firebaseId}`
      );
      return idMappingCache[firebaseId];
    }

    try {
      if (!isNaN(firebaseId) && firebaseId.length < 10) {
        console.log(`Using numeric ID ${firebaseId} directly`);
        idMappingCache[firebaseId] = firebaseId;
        return firebaseId;
      }

      console.log(
        `Attempting to resolve user ID for Firebase ID: ${firebaseId}`
      );
      const userId = await getUserDataFromFirebaseId(firebaseId);

      if (userId) {
        console.log(
          `Successfully resolved Firebase ID ${firebaseId} to user ID ${userId}`
        );
        idMappingCache[firebaseId] = userId;
        return userId;
      }

      try {
        const response = await ApiHandler.get(
          `/Users/by-firebase/${firebaseId}`
        );
        if (response && response.id) {
          console.log(`Found user ID ${response.id} via alternate endpoint`);
          idMappingCache[firebaseId] = response.id;
          return response.id;
        }
      } catch (altError) {
        console.log(`Alternate endpoint failed for ${firebaseId}:`, altError);
      }

      console.log(`Failed to resolve user ID for Firebase ID: ${firebaseId}`);
      return null;
    } catch (error) {
      console.error(`Error resolving user ID for ${firebaseId}:`, error);

      if (!isNaN(firebaseId)) {
        console.log(
          `Fallback: Using numeric firebaseId ${firebaseId} as userId`
        );
        idMappingCache[firebaseId] = firebaseId;
        return firebaseId;
      }

      return null;
    }
  };

  //fetch landlord name and first few chat users
  useEffect(() => {
    if (!currentUserId) return;
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    const quickLoad = async () => {
      try {
        console.log("Starting quick load for user:", currentUserId);
        fetchLandlordName(currentUserId).catch((err) =>
          console.error("Error fetching landlord name:", err)
        );
        let associatedIds = [];
        try {
          associatedIds = await getAssociatedUsers(currentUserId);
          console.log(`Found ${associatedIds?.length || 0} associated users`);
        } catch (error) {
          console.error("Error getting associated users:", error);
          setChatUsers([]);
          setLoading(false);
          setInitialLoad(false);
          return;
        }
        const validAssociatedIds = (associatedIds || []).filter(
          (id) => id && typeof id === "string" && id.length > 0
        );
        console.log(`${validAssociatedIds.length} valid associated IDs found`);
        if (validAssociatedIds.length === 0) {
          console.log("No valid associated users found");
          setChatUsers([]);
          setLoading(false);
          setInitialLoad(false);
          return;
        }
        const batchSize = 3;
        let loadedUsers = [];
        const firstBatch = validAssociatedIds.slice(0, batchSize);
        console.log(`Loading first batch of ${firstBatch.length} users`);
        const firstBatchPromises = firstBatch.map((id) =>
          loadSingleUser(currentUserId, id, signal).catch((err) => {
            console.error(`Error loading user ${id}:`, err);
            return null;
          })
        );
        const firstBatchResults = await Promise.all(firstBatchPromises);
        const validFirstBatch = firstBatchResults.filter(Boolean);
        console.log(
          `First batch returned ${validFirstBatch.length} valid users`
        );
        loadedUsers = [...validFirstBatch];
        if (loadedUsers.length > 0) {
          setChatUsers(loadedUsers);
          setInitialLoad(false);
        }
        if (validAssociatedIds.length > batchSize) {
          const remainingIds = validAssociatedIds.slice(batchSize);
          console.log(
            `Loading remaining ${remainingIds.length} users in background`
          );
          setTimeout(() => {
            loadRemainingUsersInBatches(
              currentUserId,
              remainingIds,
              loadedUsers,
              signal
            );
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

  // Load remaining users in batches
  const loadRemainingUsersInBatches = async (
    currentId,
    remainingIds,
    existingUsers,
    signal
  ) => {
    try {
      const batchSize = 3;
      let allUsers = [...existingUsers];

      for (let i = 0; i < remainingIds.length; i += batchSize) {
        if (signal?.aborted) {
          console.log("Loading aborted");
          return;
        }
        const batch = remainingIds.slice(i, i + batchSize);
        console.log(
          `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(
            remainingIds.length / batchSize
          )}`
        );
        // Load this batch with better error handling
        const batchPromises = batch.map((id) =>
          loadSingleUser(currentId, id, signal).catch((err) => {
            console.error(`Error loading user ${id} in batch:`, err);
            return null;
          })
        );
        // Wait for all promises to resolve, even if some fail
        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(Boolean);
        console.log(`Batch returned ${validResults.length} valid users`);
        if (validResults.length > 0) {
          // Add new users to our collection
          for (const user of validResults) {
            if (!allUsers.find((u) => u.firebaseId === user.firebaseId)) {
              allUsers.push(user);
            }
          }
          // Sort by timestamp and update state
          allUsers.sort((a, b) => {
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            return b.timestamp.seconds - a.timestamp.seconds;
          });
          setChatUsers([...allUsers]);
        }
        // Small delay to prevent UI freezing
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      console.log("Finished loading all users");
    } catch (error) {
      console.error("Error loading remaining users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load a single user's data with improved error handling
  const loadSingleUser = async (currentId, firebaseId, signal) => {
    try {
      console.log(`Loading data for user with Firebase ID: ${firebaseId}`);

      // Important: If firebaseId is invalid, return null immediately
      if (!firebaseId || typeof firebaseId !== "string") {
        console.log(`Invalid Firebase ID: ${firebaseId}`);
        return null;
      }

      // Resolve numeric user ID with better error handling
      const userId = await resolveUserId(firebaseId);
      if (!userId) {
        console.log(`Could not resolve userId for Firebase ID: ${firebaseId}`);
        return null;
      }

      console.log(`Resolved Firebase ID ${firebaseId} to user ID ${userId}`);

      // Check cache for user details
      let userDetails;
      if (userCache[firebaseId]?.details) {
        console.log(`Using cached details for ${firebaseId}`);
        userDetails = userCache[firebaseId].details;
      } else {
        // Fetch user details
        console.log(`Fetching user details for user ID: ${userId}`);
        try {
          userDetails = await ApiHandler.get(`/UserDetails/userId/${userId}`);
          if (!userDetails) {
            console.log(`No user details found for user ID: ${userId}`);
            return null;
          }
        } catch (detailsError) {
          console.error(
            `Error fetching details for user ID ${userId}:`,
            detailsError
          );
          return null;
        }

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
        // Return a placeholder first for better UI responsiveness
        messagePreview = {
          message: "Tap to start chatting",
          timestamp: null,
          count: 0,
        };

        // Fetch actual messages in the background
        getLastMessageOnly(currentId, firebaseId)
          .then((preview) => {
            if (preview) {
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

                  // Sort users by timestamp
                  return updatedUsers.sort((a, b) => {
                    if (!a.timestamp) return 1;
                    if (!b.timestamp) return -1;
                    return b.timestamp.seconds - a.timestamp.seconds;
                  });
                }

                return prevUsers;
              });
            }
          })
          .catch((err) => {
            console.error("Error fetching message preview:", err);
          });
      }

      // Extract user name with fallbacks
      const { firstName = "", lastName = "" } = userDetails || {};
      const fullName = `${firstName} ${lastName}`.trim() || "Unknown User";

      console.log(`Successfully loaded data for user: ${fullName}`);

      return {
        firebaseId,
        userId,
        fullName,
        lastMessage: messagePreview.message || "No messages",
        timestamp: messagePreview.timestamp,
        messageCount: messagePreview.count || 0,
      };
    } catch (error) {
      console.error(`Error loading data for user ${firebaseId}:`, error);
      return null;
    }
  };

  // Separate function to fetch landlord name with improved error handling
  const fetchLandlordName = async (firebaseId) => {
    try {
      console.log(`Fetching landlord name for Firebase ID: ${firebaseId}`);

      // Check cache first
      if (userCache[firebaseId]?.userId && userCache[firebaseId]?.details) {
        const { firstName = "", lastName = "" } = userCache[firebaseId].details;
        const fullName = `${firstName} ${lastName}`.trim() || "Me";
        console.log(`Using cached landlord name: ${fullName}`);
        setLandlordName(fullName);
        return;
      }

      // Direct shortcut for numeric IDs - crucial for your system
      if (!isNaN(firebaseId) && firebaseId.length < 10) {
        console.log(
          `Trying to fetch details directly with numeric ID: ${firebaseId}`
        );
        try {
          const response = await ApiHandler.get(
            `/UserDetails/userId/${firebaseId}`
          );
          if (response) {
            const { firstName = "", lastName = "" } = response;
            const fullName = `${firstName} ${lastName}`.trim() || "Me";
            console.log(`Setting landlord name to: ${fullName}`);
            setLandlordName(fullName);

            // Cache the response
            userCache[firebaseId] = {
              ...(userCache[firebaseId] || {}),
              userId: firebaseId,
              details: response,
            };
            return;
          }
        } catch (directError) {
          console.log(`Direct fetch failed for ID ${firebaseId}:`, directError);
          // Continue to try other methods
        }
      }

      // Resolve userId using our enhanced function
      const userId = await resolveUserId(firebaseId);
      if (!userId) {
        console.log("Could not resolve landlord ID, using default name");
        setLandlordName("Me");
        return;
      }

      console.log(`Fetching details for landlord ID: ${userId}`);
      try {
        const response = await ApiHandler.get(`/UserDetails/userId/${userId}`);
        if (response) {
          const { firstName = "", lastName = "" } = response;
          const fullName = `${firstName} ${lastName}`.trim() || "Me";
          console.log(`Setting landlord name to: ${fullName}`);
          setLandlordName(fullName);

          // Cache the response
          userCache[firebaseId] = {
            ...(userCache[firebaseId] || {}),
            userId,
            details: response,
          };
        } else {
          console.log("No landlord details found, using default name");
          setLandlordName("Me");
        }
      } catch (error) {
        console.error(
          `Error fetching details for landlord ID ${userId}:`,
          error
        );
        setLandlordName("Me");
      }
    } catch (error) {
      console.error("Error fetching landlord name:", error);
      setLandlordName("Me"); // Default fallback
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
      return { message: "Tap to start chatting", timestamp: null, count: 0 };
    }
  };

  const handleUserClick = async (user) => {
    try {
      console.log(`User clicked: ${user.fullName} (${user.firebaseId})`);

      let landlordDbId;

      // Use cached user ID if available
      if (userCache[currentUserId]?.userId) {
        landlordDbId = userCache[currentUserId].userId;
        console.log(`Using cached landlord ID: ${landlordDbId}`);
      } else {
        // Key fix: If currentUserId is already numeric, use it directly
        if (!isNaN(currentUserId) && currentUserId.length < 10) {
          landlordDbId = currentUserId;
          console.log(`Using numeric currentUserId directly: ${landlordDbId}`);
        } else {
          // Otherwise resolve with improved function
          landlordDbId = await resolveUserId(currentUserId);
          if (!landlordDbId) {
            console.error("Could not resolve landlord ID for navigation");
            return;
          }
          console.log(`Resolved landlord ID: ${landlordDbId}`);
        }
      }

      const chatId = `chat_${landlordDbId}_${user.userId}`;
      console.log(`Navigating to chat: ${chatId}`);

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

  // Format date for message timestamps
  const formatDate = (timestamp) => {
    if (!timestamp) return "No date";

    try {
      const date = new Date(timestamp.seconds * 1000);
      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Today - show time
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (diffDays === 1) {
        return "Yesterday";
      } else if (diffDays < 7) {
        // Show day name for last week
        return date.toLocaleDateString([], { weekday: "short" });
      } else {
        // Show date for older messages
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Filter chats based on search term
  const filteredChats = useMemo(() => {
    if (!searchTerm.trim()) {
      return chatUsers;
    }

    return chatUsers.filter(
      (user) =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [chatUsers, searchTerm]);

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
