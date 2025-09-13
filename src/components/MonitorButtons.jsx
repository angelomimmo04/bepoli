import React from "react";
import { useTracking } from "../hooks/useTracking";

export default function MonitorButtons({ startTracking, stopTracking }) {
    return (
        <div className="monitor-buttons">
            <button className="monitor-btn start" onClick={startTracking}>▶ Avvia Monitoraggio</button>
            <button className="monitor-btn stop" onClick={stopTracking}>⛔ Ferma Monitoraggio</button>
        </div>
    );
}

