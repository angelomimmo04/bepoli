
import React from "react";
import './App.css';
import Sidebar from './sidebar/Sidebar';
import Chat from './Chat/Chat';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { loadFromLocalStorage } from "./localStore";
import Avatar from "@mui/material/Avatar";

function App() {
  return (
    <div className="app">
      <div className="app_body">
        <Router>
          <Sidebar />
          <Routes>
            <Route path="/" element={
              <div className="info-center">
                <div className="info-center-item" />
                <Avatar
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(loadFromLocalStorage("user")?.displayName || "Utente")}&background=random&color=fff`}
                  onError={(e) => {
                    e.currentTarget.src = "/default-avatar.png";
                  }}
                />
                <div className="info-center-item" />
                {loadFromLocalStorage("user")?.displayName || "Utente"}
                <div className="info-center-item" />
                Seleziona una Chat!
              </div>
            } />
            <Route path="/rooms/:roomId" element={<Chat />} />
          </Routes>
        </Router>
      </div>
    </div>
  );
}

export default App;

