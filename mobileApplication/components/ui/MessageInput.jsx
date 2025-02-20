// /src/components/MessageInput.js
import React, { useState } from "react";

const MessageInput = ({ onSendMessage }) => {
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        style={{
          padding: "10px",
          flex: 1,
          marginRight: "10px",
          borderRadius: "5px",
        }}
      />
      <button
        onClick={handleSendMessage}
        style={{ padding: "10px", borderRadius: "5px" }}
      >
        Send
      </button>
    </div>
  );
};

export default MessageInput;
