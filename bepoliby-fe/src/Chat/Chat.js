
import React, { useState, useEffect } from 'react';
import { InsertEmoticon } from "@mui/icons-material";
import "./Chat.css";
import { Avatar, IconButton } from '@mui/material';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Pusher from 'pusher-js';
import EmojiPicker from 'emoji-picker-react';

function Chat() {
  const { roomId } = useParams();
  const [input, setInput] = useState("");
  const [roomName, setRoomName] = useState("");
  const [lastSeen, setLastSeen] = useState("");
  const [roomMessages, setRoomMessages] = useState([]);
  const navigate = useNavigate();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:9000';

  // Genera o recupera userId e userName persistenti dal localStorage
  useEffect(() => {
    let storedId = localStorage.getItem('chatUserId');
    if (!storedId) {
      storedId = 'user-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('chatUserId', storedId);
    }
    setUserId(storedId);

    let storedName = localStorage.getItem('chatUserName');
    if (!storedName) {
      storedName = 'Anonimo-' + Math.floor(Math.random() * 1000);
      localStorage.setItem('chatUserName', storedName);
    }
    setUserName(storedName);
  }, []);

  const onEmojiClick = (emojiData) => {
    setInput(prev => prev + emojiData.emoji);
  };

  useEffect(() => {
    if (!roomId) return;

    const pusher = new Pusher('6a10fce7f61c4c88633b', {
      cluster: 'eu'
    });

    const channel = pusher.subscribe(`room_${roomId}`);

    channel.bind('inserted', function (payload) {
      const newMsg = payload.message;

      setRoomMessages(prevMessages => {
        // Evita doppioni
        if (prevMessages.some(m => m._id === newMsg._id)) return prevMessages;

        // Sostituisci messaggio temporaneo con messaggio reale (con _id definitivo)
        const tempIndex = prevMessages.findIndex(m =>
          m._id && m._id.startsWith('temp-') &&
          m.message === newMsg.message &&
          m.uid === newMsg.uid
        );

        if (tempIndex !== -1) {
          const copy = [...prevMessages];
          copy[tempIndex] = newMsg;
          return copy;
        }

        return [...prevMessages, newMsg];
      });

      setLastSeen(newMsg.timestamp);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [roomId]);

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const roomRes = await axios.get(`${apiUrl}/api/v1/rooms/${roomId}`);
        setRoomName(roomRes.data.name);

        const messagesRes = await axios.get(`${apiUrl}/api/v1/rooms/${roomId}/messages`);
        setRoomMessages(messagesRes.data);

        const lastMsg = messagesRes.data[messagesRes.data.length - 1];
        setLastSeen(lastMsg?.timestamp || null);
      } catch (err) {
        navigate("/");
      }
    };

    if (roomId) fetchRoomData();
  }, [roomId, navigate, apiUrl]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const newMessage = {
      _id: tempId,
      message: input,
      name: userName || "Anonimo",
      timestamp: new Date().toISOString(),
      uid: userId || "default",
    };

    setRoomMessages(prev => [...prev, newMessage]);
    setInput("");

    try {
      await axios.post(`${apiUrl}/api/v1/rooms/${roomId}/messages`, {
        message: newMessage.message,
        name: newMessage.name,
        timestamp: newMessage.timestamp,
        uid: newMessage.uid,
      });
    } catch (error) {
      console.error("❌ Errore nell'invio del messaggio:", error);
      setRoomMessages(prev => prev.filter(msg => msg._id !== tempId));
      alert("Errore nell'invio del messaggio, riprova.");
    }
  };

  return (
    <div className='Chat' key={roomId}>
      <div className='Chat_header'>
        <Avatar
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(roomName)}&background=random&color=fff&size=128`}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/default-avatar.png";
          }}
        />
        <div className='Chat_header_info'>
          <h3>{roomName}</h3>
          <p>
            Visto l'ultima volta:{" "}
            {lastSeen
              ? new Date(lastSeen).toLocaleString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              : "Mai"}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#666' }}>
            Sei connesso come <b>{userName}</b>
          </p>
        </div>
      </div>

      <div className="Chat_body">
        {roomMessages.map((message, index) => {
          const date = new Date(message.timestamp);
          const isValidDate = !isNaN(date);
          const isOwnMessage = message.uid === userId;

          return (
            <div
              key={message._id || index}
              className={`Chat_message_container ${isOwnMessage ? "Chat_receiver_container" : ""}`}
            >
              {!isOwnMessage && (
                <Avatar
                  className="Chat_avatar"
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(message.name)}&background=random&color=fff&size=64`}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/default-avatar.png";
                  }}
                />
              )}
              <span className="Chat_name">{message.name}</span>
              <div className={`Chat_message ${isOwnMessage ? "Chat_receiver" : ""}`}>
                {message.message}
                <span className="Chat_timestamp">
                  {isValidDate
                    ? date.toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "Data non valida"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className='Chat_footer'>
        <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
          <InsertEmoticon />
        </IconButton>
        <form onSubmit={sendMessage}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scrivi un messaggio..."
            type="text"
          />
          <button type="submit" disabled={!input.trim()}>Invia</button>
        </form>
        {showEmojiPicker && (
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              onEmojiClick(emojiData);
              setShowEmojiPicker(false);
            }}
            width={300}
            height={350}
          />
        )}
      </div>
    </div>
  );
}

export default Chat;







