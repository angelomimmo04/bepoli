require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Servi i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connesso a MongoDB Atlas"))
    .catch((err) => console.error("❌ Errore di connessione:", err));

const utenteSchema = new mongoose.Schema({
    nome: String,
    username: { type: String, unique: true },
    password: String, // password hashed
});

const Utente = mongoose.model("Utente", utenteSchema);

// Rotta per la home (login)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login.html"));
});

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
        const nuovoUtente = new Utente({ nome, username, password: hash });

        await nuovoUtente.save();
        res.status(201).json({ message: "Utente registrato con successo" });
    } catch (err) {
        res.status(500).json({ message: "Errore server" });
    }
});

// Avvio server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server in ascolto su porta ${PORT}`));
