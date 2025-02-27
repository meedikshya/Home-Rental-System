import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getMessages, sendMessage } from "../../firebaseConfig";

const useChat = (chatId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setError(null);
      } else {
        setError("User not logged in");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = getMessages(chatId, setMessages);
      setLoading(false);
      return () => unsubscribe();
    }
  }, [chatId, user]);

  const sendNewMessage = async (messageText) => {
    if (!user) {
      setError("User is not logged in");
      return;
    }

    try {
      await sendMessage(chatId, messageText, user.uid, user.email);
      setError(null); // Clear any previous errors on successful send
    } catch (err) {
      setError("Error sending message");
    }
  };

  return {
    messages,
    loading,
    error,
    sendNewMessage,
  };
};

export default useChat;
