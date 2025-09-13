import React, {useEffect, useState} from "react";
import Header from "./components/Header";
import MonitorButtons from "./components/MonitorButtons";
import Feed from "./components/Feed";
import { useTracking } from "./hooks/useTracking";
import CreatePostForm from "./components/CreatePostForm";

useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (!user) {
        window.location.href = "/login.html"; // o pagina login se non loggato
    }
}, []);


function App() {
    const [locationFilter, setLocationFilter] = useState("Fuori dalle aree conosciute");

    const { coords, locationName, status, startTracking, stopTracking } = useTracking((zoneName) => {
        setLocationFilter(zoneName || "Fuori dalle aree conosciute");
    });

    return (
        <div className="App">
            <Header coords={coords} locationName={locationName} status={status} />
            <MonitorButtons startTracking={startTracking} stopTracking={stopTracking} />
            <CreatePostForm locationName={locationName} />
            <Feed locationFilter={locationFilter} />
        </div>
    );
}

export default App;
