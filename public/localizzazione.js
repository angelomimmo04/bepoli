let watchId = null;

const zones = [
  { name: "Radio", lat: 45.4792655, lon: 9.2285083, radius: 0.06 },
  { name: "Biblioteca", lat: 45.479781, lon: 9.225633, radius: 0.03 },
  { name: "Piazza Leonardo", lat: 45.478123, lon: 9.227532, radius: 0.05 },
];

const zoneImages = {
  Radio: "images/radio.jpg",
  Biblioteca: "images/biblioteca.jpg",
  "Piazza Leonardo": "images/piazzaleonardo.jpg",
};

function startTracking() {
  if (!navigator.geolocation) {
    alert("Geolocalizzazione non supportata dal browser.");
    return;
  }

  watchId = navigator.geolocation.watchPosition(successCallback, errorCallback, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  });
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    document.getElementById("coords").textContent = "Coordinate: --";
    document.getElementById("location").textContent = "Luogo: --";
    document.getElementById("accuracy").textContent = "Accuratezza: -- metri";
    document.getElementById("zoneImage").style.display = "none";
  }
}

function successCallback(position) {
  const { latitude, longitude, accuracy } = position.coords;

  document.getElementById("coords").textContent = `Coordinate: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  document.getElementById("accuracy").textContent = `Accuratezza: ${Math.round(accuracy)} metri`;

  let foundZone = null;

  for (const zone of zones) {
    const distance = getDistanceFromLatLonInKm(latitude, longitude, zone.lat, zone.lon);
    if (distance <= zone.radius) {
      foundZone = zone;
      break;
    }
  }

  if (foundZone) {
    document.getElementById("location").textContent = `Luogo: ${foundZone.name}`;
    const zoneImageElement = document.getElementById("zoneImage");
    const imagePath = zoneImages[foundZone.name];
    if (imagePath) {
      zoneImageElement.src = imagePath;
      zoneImageElement.style.display = "block";
    } else {
      zoneImageElement.style.display = "none";
    }
  } else {
    document.getElementById("location").textContent = "Luogo: Fuori dalle zone coperte";
    document.getElementById("zoneImage").style.display = "none";
  }
}

function errorCallback(error) {
  console.error("Errore nella geolocalizzazione:", error.message);
  alert("Errore nella geolocalizzazione: " + error.message);
}

// Formula Haversine per calcolare la distanza in km
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raggio della Terra in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
