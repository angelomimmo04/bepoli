//let watchId = null;

    const zones = [
        // Le tue zone come da codice originale, le ho omesse per brevità
        {
            name: "Radio Frequenza Libera",
            points: [
                {lat: 41.108692, lon: 16.879609},
                {lat: 41.108730, lon: 16.879755},
                {lat: 41.108786, lon: 16.879728},
                {lat: 41.108755, lon: 16.879577}
            ]
        },
        {
            name: "Cortile",
            points: [
                {lat: 41.108673, lon: 16.879576},
                {lat: 41.108783, lon: 16.879986},
                {lat: 41.108458, lon: 16.879681},
                {lat: 41.108567, lon: 16.880080}
            ]
        },
        {
            name: "Aula Magna",
            points: [
                {lat: 41.108799, lon: 16.879576},
                {lat: 41.108883, lon: 16.879879},
                {lat: 41.109108, lon: 16.879768},
                {lat: 41.109027, lon: 16.879464}
            ]
        },
        {
            name: "Atrio",
            points: [
                {lat: 41.108756, lon: 16.879479},
                {lat: 41.108994, lon: 16.879349},
                {lat: 41.108822, lon: 16.878692},
                {lat: 41.108576, lon: 16.878814}
            ]
        },
        {
            name: "Student",
            points: [
                {lat: 41.107916, lon: 16.879212},
                {lat: 41.107828, lon: 16.879256},
                {lat: 41.107993, lon: 16.879824},
                {lat: 41.108066, lon: 16.879789}
            ]
        },
        {
            name: "Corridoio Aule A-I",
            points: [
                {lat: 41.108545, lon: 16.878755},
                {lat: 41.108572, lon: 16.878882},
                {lat: 41.107832, lon: 16.879246},
                {lat: 41.107794, lon: 16.879114}
            ]
        },
        {
            name: "Corridoio Aule D-L",
            points: [
                {lat: 41.108001, lon: 16.879827},
                {lat: 41.108034, lon: 16.879960},
                {lat: 41.108678, lon: 16.879564},
                {lat: 41.108727, lon: 16.879472}
            ]
        },
        {
            name: "Bar",
            points: [
                {lat: 41.108673, lon: 16.879233},
                {lat: 41.108560, lon: 16.879272},
                {lat: 41.108520, lon: 16.879117},
                {lat: 41.108614, lon: 16.879067}
            ]
        },
        {
            name: "Poli library",
            points: [
                {lat: 41.108125, lon: 16.878818},
                {lat: 41.108101, lon: 16.878692},
                {lat: 41.108560, lon: 16.878464},
                {lat: 41.108583, lon: 16.878589}
            ]
        },
        {
            name: "DEI",
            points: [
                {lat: 41.108722, lon: 16.878216},
                {lat: 41.108694, lon: 16.878092},
                {lat: 41.109402, lon: 16.877741},
                {lat: 41.109439, lon: 16.877872}
            ]
        },
        {
            name: "casa dell'acqua",
            points: [
                {lat: 41.109148, lon: 16.879921},
                {lat: 41.109617, lon: 16.879698},
                {lat: 41.109521, lon: 16.879375},
                {lat: 41.109075, lon: 16.879595}
            ]
        },
        {
            name: "entrata re david",
            points: [
                {lat: 41.109250, lon: 16.877026},
                {lat: 41.109400, lon: 16.877711},
                {lat: 41.108578, lon: 16.878119},
                {lat: 41.108384, lon: 16.877381}
            ]
        },
        {
            name: "entrata orabona",
            points: [
                {lat: 41.107868, lon: 16.880086},
                {lat: 41.108473, lon: 16.879745},
                {lat: 41.108052, lon: 16.880669},
                {lat: 41.108612, lon: 16.880293}
            ]
        },
        {
            name: "architettura",
            points: [
                {lat: 41.109040, lon: 16.878583},
                {lat: 41.109202, lon: 16.879194},
                {lat: 41.109690, lon: 16.878965},
                {lat: 41.109522, lon: 16.878368}
            ]
        },
        {
            name: "classi A-C",
            points: [
                {lat: 41.108621, lon: 16.879055},
                {lat: 41.108577, lon: 16.878891},
                {lat: 41.108258, lon: 16.879048},
                {lat: 41.108314, lon: 16.879241}
            ]
        },
        {
            name: "classi G-I",
            points: [
                {lat: 41.108211, lon: 16.879072},
                {lat: 41.108275, lon: 16.879299},
                {lat: 41.107929, lon: 16.879213},
                {lat: 41.107982, lon: 16.879417}
            ]
        },
        {
            name: "classi D-AM",
            points: [
                {lat: 41.108680, lon: 16.879264},
                {lat: 41.108726, lon: 16.879444},
                {lat: 41.108354, lon: 16.879399},
                {lat: 41.108414, lon: 16.879611}
            ]
        },
        {
            name: "classi L-N",
            points: [
                {lat: 41.108371, lon: 16.879628},
                {lat: 41.108308, lon: 16.879429},
                {lat: 41.108068, lon: 16.879773},
                {lat: 41.108021, lon: 16.879573}
            ]
        },
        {
            name: "control room",
            points: [
                {lat: 41.108735, lon: 16.878516},
                {lat: 41.108624, lon: 16.878130},
                {lat: 41.108487, lon: 16.878194},
                {lat: 41.108519, lon: 16.878317}
            ]
        }
    ];


let watchId = null;
let lastZoneName = null;
let stabilityCounter = 0;
const stabilityThreshold = 3;
window.currentZoneName = null;

function startTracking() {
    const outputCoords = document.getElementById("coords");
    const outputLocation = document.getElementById("location");
    const outputAccuracy = document.getElementById("accuracy");
    const locationStatus = document.getElementById("locationStatus");

    if (!navigator.geolocation) {
        outputCoords.textContent = "Geolocalizzazione non supportata.";
        return;
    }

    if (watchId !== null) navigator.geolocation.clearWatch(watchId);

    outputCoords.textContent = "📡 Monitoraggio attivo...";
    outputAccuracy.textContent = "-- metri";
    outputLocation.textContent = "--";
    locationStatus.textContent = "📍 Attendere il rilevamento...";
    locationStatus.style.color = "orange";

    watchId = navigator.geolocation.watchPosition(
        (position) => {
            //const lat = position.coords.latitude;
            //const lon = position.coords.longitude;
            const lat = 41.108750
            const lon = 16.879650
            
            console.log("Latitudine:", lat, "Longitudine:", lon);
            const accuracy = position.coords.accuracy;

            outputCoords.textContent = `Coordinate: Lat = ${lat.toFixed(6)}, Lon = ${lon.toFixed(6)}`;
            outputAccuracy.textContent = `Accuratezza: ${Math.round(accuracy)} metri`;

            const zone = getZoneFromCoords(lat, lon);
            const zoneName = zone || "Fuori dalle aree conosciute";

            if (zoneName === lastZoneName) {
                stabilityCounter++;
            } else {
                lastZoneName = zoneName;
                stabilityCounter = 1;
            }

        

            if (stabilityCounter >= stabilityThreshold) {
                outputLocation.textContent = `Luogo: ${zoneName}`;
                locationStatus.textContent = "✅ Posizione rilevata";
                locationStatus.style.color = "green";
                window.currentZoneName = zoneName;
            }
        },
        (error) => {
            outputCoords.textContent = "Errore geolocalizzazione: " + error.message;
            outputLocation.textContent = "--";
            outputAccuracy.textContent = "-- metri";
            locationStatus.textContent = "❌ Errore posizione";
            locationStatus.style.color = "red";
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}




function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        document.getElementById("coords").textContent = "Monitoraggio interrotto.";
        document.getElementById("location").textContent = "--";
        document.getElementById("accuracy").textContent = "-- metri";
        document.getElementById("locationStatus").textContent = "🔴 Monitoraggio disattivato";
        document.getElementById("locationStatus").style.color = "gray";
    }
}

function getZoneFromCoords(lat, lon) {
    for (const zone of zones) {
        if (isInsidePolygon(lat, lon, zone.points)) return zone.name;
    }
    return null;
}

function isInsidePolygon(lat, lon, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat, yi = polygon[i].lon;
        const xj = polygon[j].lat, yj = polygon[j].lon;
        const intersect = ((yi > lon) !== (yj > lon)) &&
            (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Rendi le funzioni disponibili globalmente
window.startTracking = startTracking;
window.stopTracking = stopTracking;
