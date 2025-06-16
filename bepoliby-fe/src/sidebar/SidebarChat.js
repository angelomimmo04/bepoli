import React from "react";
import './SidebarChat.css';
import { Avatar } from "@mui/material";
import { Link } from "react-router-dom";

const SidebarChat = ({ id, name, lastMessageText }) => {
  const truncateMessage = (text, maxLength = 30) => {
    if (!text) return "-";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <Link to={`/rooms/${id}`} className="sidebarChat">
      <Avatar
        src="/default-avatar.png"
        alt={name}
      />
      <div className="sidebarChat_info">
        <h2>{name}</h2>
        <p>{truncateMessage(lastMessageText)}</p>
      </div>
    </Link>
  );
};

export default SidebarChat;







