require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path");
const multer = require("multer");
const session = require("express-session");
const csrf = require("csurf");
const cookieParser = require("cookie-parser");
const { OAuth2Client } = require("google-auth-library");

const CLIENT_ID = '42592859457-ausft7g5gohk7mf96st2047ul9rk8o0v.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

const app = express();
app.set('trust proxy', 1);

// --- Funzione fingerprint alleggerita ---
function getFingerprint(req) {
  // Solo user-agent per ridurre falsi positivi
  return req.headers['user-agent'] || '';
}

// --- Middleware fingerprint ---
function checkFingerprint(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: "Non autorizzato" });

  const currentFp = getFingerprint(req);
  const savedFp = req.session.fingerprint;

  if (!savedFp) {
    req.session.fingerprint = currentFp;
    return next();
  }

  if (savedFp !== currentFp) {
    req.session.destroy(err => {
      if (err) console.error('Errore distruggendo sessione:', err);
      return res.status(403).json({ message: "Sessione invalida, effettua di nuovo il login." });
    });
  } else {
    next();
  }
}

// --- MIDDLEWARES ---

app.use(cors({
  origin: 'https://bepoli.onrender.com',
  credentials: true
}));

app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge: 1000 * 60 * 30, // 30 minuti
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const csrfProtection = csrf({ cookie: false });

// --- DATABASE ---

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connesso a MongoDB Atlas"))
  .catch((err) => console.error("❌ Errore di connessione:", err));

// --- SCHEMA UTENTE ---

const utenteSchema = new mongoose.Schema({
  nome: String,
  username: { type: String, unique: true },
  password: String,
  bio: String,
  profilePic: {
    data: Buffer,
    contentType: String,
  },
});

const Utente = mongoose.model("Utente", utenteSchema);

// --- MULTER SETUP ---

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- ROTTE ---

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get("/csrf-token", (req, res, next) => {
  req.session.touch();
  next();
}, csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

// 🔐 Login
app.post("/login", csrfProtection, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Dati mancanti" });

  try {
    const utente = await Utente.findOne({ username });
    if (!utente) return res.status(400).json({ message: "Username o password errati" });

    const validPassword = await bcrypt.compare(password, utente.password);
    if (!validPassword) return res.status(400).json({ message: "Username o password errati" });

    req.session.user = {
      id: utente._id,
      nome: utente.nome,
      username: utente.username
    };
    req.session.fingerprint = getFingerprint(req);

    res.status(200).json({
      message: "Login effettuato con successo",
      user: req.session.user
    });
  } catch (err) {
    res.status(500).json({ message: "Errore server" });
  }
});

// 📝 Registrazione
app.post("/register", csrfProtection, async (req, res) => {
  const { nome, username, password } = req.body;
  if (!nome || !username || !password)
    return res.status(400).json({ message: "Dati mancanti" });

  try {
    const esiste = await Utente.findOne({ username });
    if (esiste) return res.status(400).json({ message: "Username già utilizzato" });

    const hash = await bcrypt.hash(password, 10);
    const nuovoUtente = new Utente({
      nome,
      username,
      password: hash,
      bio: "",
      profilePic: { data: null, contentType: null }
    });

    await nuovoUtente.save();
    res.status(201).json({ message: "Utente registrato con successo" });
  } catch (err) {
    res.status(500).json({ message: "Errore server" });
  }
});

// 🔐 Login con Google
app.post('/auth/google', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ message: 'Token mancante' });

  try {
    const ticket = await client.verifyIdToken({ idToken: id_token, audience: CLIENT_ID });
    const payload = ticket.getPayload();

    let utente = await Utente.findOne({ username: payload.email });

    if (!utente) {
      utente = new Utente({
        nome: payload.name,
        username: payload.email,
        password: '',
        bio: "",
        profilePic: { data: null, contentType: null }
      });
      await utente.save();
    }

    req.session.user = {
      id: utente._id,
      nome: utente.nome,
      username: utente.username
    };
    req.session.fingerprint = getFingerprint(req);

    res.status(200).json({
      message: 'Login Google effettuato con successo',
      user: req.session.user
    });
  } catch (error) {
    console.error('Errore verifica token Google:', error);
    res.status(401).json({ message: 'Token Google non valido' });
  }
});

// ✏️ Aggiornamento profilo
app.post('/api/update-profile', checkFingerprint, csrfProtection, upload.single('profilePic'), async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: "Non autorizzato" });

  const userId = req.session.user.id;
  const bio = req.body.bio;
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
    const updatedUser = await Utente.findByIdAndUpdate(userId, { $set: updateData }, { new: true });
    if (!updatedUser) return res.status(404).json({ message: "Utente non trovato" });

    req.session.user.bio = updatedUser.bio;

    return res.status(200).json({ message: "Profilo aggiornato con successo" });
  } catch (err) {
    console.error("Errore aggiornamento profilo:", err);
    return res.status(500).json({ message: "Errore nel salvataggio" });
  }
});

// 📷 Recupera immagine profilo
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

// 🙋‍♂️ Recupera dati utente autenticato
app.get("/api/user", checkFingerprint, async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: "Non autorizzato" });

  try {
    const user = await Utente.findById(req.session.user.id);
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Errore server" });
  }
});

// 🚪 Logout
app.post('/logout', checkFingerprint, csrfProtection, (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Errore durante il logout' });
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logout effettuato' });
  });
});


// --- SERVER ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server in ascolto su porta ${PORT}`);
});

