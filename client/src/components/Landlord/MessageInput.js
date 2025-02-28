import React, { useState } from "react";
import { FaPaperPlane } from "react-icons/fa";

const MessageInput = ({ onSendMessage }) => {
  const [message, setMessage] = useState("");

  const handleSend = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <form
      className="flex items-center p-3 border-t border-gray-300 bg-white"
      onSubmit={handleSend}
    >
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="flex-1 border border-gray-300 rounded-l-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Type a message..."
      />
      <button
        type="submit"
        className="bg-blue-500 hover:bg-blue-600 text-white rounded-r-full py-2 px-4 transition"
        disabled={!message.trim()}
      >
        <FaPaperPlane />
      </button>
    </form>
  );
};

export default MessageInput;
