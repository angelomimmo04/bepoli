// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDuOuXPIWoz4Y1zjN6mkNAoyudhBM_jB94",
  authDomain: "bepoliby.firebaseapp.com",
  projectId: "bepoliby",
  storageBucket: "bepoliby.appspot.com", // occhio: corretto se prima era sbagliato
  messagingSenderId: "419175877713",
  appId: "1:419175877713:web:7ffb672703b625d66c3c70",
  measurementId: "G-VTTY8NLWP4"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Ottieni auth e provider
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };


