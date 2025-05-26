const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = '42592859457-ausft7g5gohk7mf96st2047ul9rk8o0v.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const multer = require("multer");
const fs = require("fs");

const storage = multer.memoryStorage(); // salva in RAM, non su disco
const upload = multer({ storage: storage });
const session = require('express-session');


// Servi i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connesso a MongoDB Atlas"))
    .catch((err) => console.error("❌ Errore di connessione:", err));

const utenteSchema = new mongoose.Schema({
    nome: String,
    username: { type: String, unique: true },
    password: String, // password hashed
    bio: String, // aggiunto campo bio
    profilePic: {
        data: Buffer,
        contentType: String,
    },

});

const Utente = mongoose.model("Utente", utenteSchema);

// Rotta per la home (login)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login.html"));
});



app.use(session({
  secret: process.env.SESSION_SECRET || 'una-secret-key-molto-segreta', // cambia in produzione!
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 giorno di durata della sessione
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // solo su HTTPS in produzione
  }
}));




// Login endpoint
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ message: "Dati mancanti" });

    try {
        const utente = await Utente.findOne({ username });
        if (!utente)
            return res.status(400).json({ message: "Username o password errati" });

        const validPassword = await bcrypt.compare(password, utente.password);
        if (!validPassword)
            return res.status(400).json({ message: "Username o password errati" });

        // Login OK
        res.status(200).json({
            message: "Login effettuato con successo",
            user: {
                id: utente._id,
                nome: utente.nome,
                username: utente.username,
            },
        });
    } catch (err) {
        res.status(500).json({ message: "Errore server" });
    }
});

// Registrazione endpoint
app.post("/register", async (req, res) => {
    const { nome, username, password } = req.body;

    if (!nome || !username || !password)
        return res.status(400).json({ message: "Dati mancanti" });

    try {
        const esiste = await Utente.findOne({ username });
        if (esiste) {
            return res.status(400).json({ message: "Username già utilizzato" });
        }

        const hash = await bcrypt.hash(password, 10);
        const nuovoUtente = new Utente({ 
    nome, 
    username, 
    password: hash,
    bio: "",  // bio vuota di default
    profilePic: { 
        data: null,        // nessuna immagine iniziale
        contentType: null
    }
});


        await nuovoUtente.save();
        res.status(201).json({ message: "Utente registrato con successo" });
    } catch (err) {
        res.status(500).json({ message: "Errore server" });
    }
});

app.post('/auth/google', async (req, res) => {
    const { id_token } = req.body;
    if (!id_token) return res.status(400).json({ message: 'Token mancante' });

    try {
        // Verifica il token ID ricevuto da Google
        const ticket = await client.verifyIdToken({
            idToken: id_token,
            audience: CLIENT_ID,
        });

        const payload = ticket.getPayload();
        // payload contiene email, nome, sub (id google), ecc.

        // Cerca utente nel DB con email (qui assumo username= email)
        let utente = await Utente.findOne({ username: payload.email });

        if (!utente) {
            // Se non esiste, crealo automaticamente senza password (login solo con Google)
            utente = new Utente({
                nome: payload.name,
                username: payload.email,
                password: '', // o metti null, non serve password perché login Google
            });
            await utente.save();
        }

        // Login riuscito: ritorna dati utente
        res.status(200).json({
            message: 'Login Google effettuato con successo',
            user: {
                id: utente._id,
                nome: utente.nome,
                username: utente.username,
            },
        });
    } catch (error) {
        console.error('Errore verifica token Google:', error);
        res.status(401).json({ message: 'Token Google non valido' });
    }
});




const { Types } = require("mongoose");

app.post("/api/update-profile", upload.single("profilePic"), async (req, res) => {
    console.log("📥 Ricevuta richiesta aggiornamento profilo");
    console.log("userId:", req.body.userId);
    console.log("bio:", req.body.bio);
    console.log("file:", req.file);

    const { userId, bio } = req.body;
    const profilePic = req.file;

    const updateData = {};
    if (bio) updateData.bio = bio;
    if (profilePic) {
        updateData.profilePic = {
            data: profilePic.buffer,
            contentType: profilePic.mimetype,
        };
    }

    try {
        const updatedUser = await Utente.findByIdAndUpdate(
    new Types.ObjectId(userId),
    { $set: updateData },
    { new: true }
);

        if (!updatedUser) {
            return res.status(404).send("Utente non trovato");
        }
        res.sendStatus(200);
    } catch (err) {
        console.error("❌ Errore nel salvataggio profilo:", err);
        res.status(500).send("Errore nel salvataggio");
    }
});


app.get("/api/user-photo/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await Utente.findById(userId);
        if (user && user.profilePic && user.profilePic.data) {
            res.contentType(user.profilePic.contentType);
            res.send(user.profilePic.data);
        } else {
            res.status(404).send("Foto non trovata");
        }
    } catch (err) {
        console.error("Errore recupero immagine:", err);
        res.status(500).send("Errore server");
    }
});

app.get("/api/user/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const user = await Utente.findById(id).select("nome username bio");
        if (!user) {
            return res.status(404).send("Utente non trovato");
        }

        res.json(user);
    } catch (err) {
        console.error("❌ Errore nel recupero utente:", err);
        res.status(500).send("Errore server");
    }
});







// Avvio server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server in ascolto su porta ${PORT}`));
