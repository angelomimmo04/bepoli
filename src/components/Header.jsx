import React, { useEffect } from "react";

export default function Header({ coords, locationName, status }) {
    // Animazione del logo al caricamento
    useEffect(() => {
        const playAnimation = sessionStorage.getItem("playLogoAnimation");
        if (playAnimation === "true") {
            const logo = document.getElementById("logo");
            if (logo) {
                logo.classList.add("logo-entrance");
            }
            sessionStorage.removeItem("playLogoAnimation");
        }
    }, []);

    return (
        <header className="header">
            <a href="home.html">
                <img
                    src="/logobepoli.png"
                    alt="Logo"
                    className="logo"
                    id="logo"
                />
            </a>
            <nav className="nav">
                <a href="profile.html" className="profile-link">Profilo</a>
                <a href="home.html" className="active">Home</a>
                <a href="search.html">Cerca</a>
                <a href="#" onClick={() => alert("Messaggi cliccato")}>Messaggi</a>
            </nav>
            <div className="coords-nav">
                <p>
                    {coords?.lat !== null && coords?.lon !== null
                        ? `Lat: ${coords.lat.toFixed(6)}, Lon: ${coords.lon.toFixed(6)}`
                        : "Coordinate: --"}
                </p>
                <p>{locationName || "Luogo: --"}</p>
                <p>
                    {coords?.accuracy !== null
                        ? `Accuratezza: ${Math.round(coords.accuracy)} metri`
                        : "Accuratezza: -- metri"}
                </p>
                <p>{status || "Attendere il rilevamento della posizione..."}</p>
            </div>
        </header>
    );
}
