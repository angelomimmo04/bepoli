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
const jwt = require("jsonwebtoken");

const CLIENT_ID = '42592859457-ausft7g5gohk7mf96st2047ul9rk8o0v.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

const storage = multer.memoryStorage();
const upload = multer({ storage });

const app = express();
app.set('trust proxy', 1);

// --- Middleware ---
app.use(cors({
  origin: 'https://bepoli.onrender.com',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sicurezza COOP/COEP
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true, // necessario per CSRF iniziale
  rolling: true,
  cookie: {
    maxAge: 1000 * 60 * 30,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// CSRF
const csrfProtection = csrf({ cookie: false });

// --- DB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connesso a MongoDB"))
  .catch(err => console.error("Connessione fallita:", err));

// --- Schemi Utente e Post ---
const utenteSchema = new mongoose.Schema({
  nome: String,
  username: { type: String, unique: true },
  password: String,
  bio: String,
  profilePic: { data: Buffer, contentType: String },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Utente" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "Utente" }],
  utentiRecenti: [{ type: mongoose.Schema.Types.ObjectId, ref: "Utente" }]
});
const Utente = mongoose.model("Utente", utenteSchema);

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Utente" },
  desc: String,
  image: { data: Buffer, contentType: String },
  location: String,
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Utente" }],
  comments: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "Utente" },
      text: String,
      location: String,
      createdAt: { type: Date, default: Date.now }
    }
  ]
});
const Post = mongoose.model("Post", postSchema);

// --- Middleware Fingerprint ---
function getFingerprint(req) {
  return req.headers['user-agent'] || '';
}

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
      if (err) console.error("Errore distruggendo sessione:", err);
      return res.status(403).json({ message: "Sessione invalida, effettua di nuovo il login." });
    });
  } else {
    next();
  }
}

// --- Rotte API ---

// CSRF token
app.get("/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Auth token JWT
app.get("/api/auth-token", checkFingerprint, (req, res) => {
  const payload = {
    id: req.session.user.id,
    username: req.session.user.username,
    nome: req.session.user.nome
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
  res.json({ token });
});

// Login tradizionale
app.post("/login", csrfProtection, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Dati mancanti" });

  try {
    const utente = await Utente.findOne({ username });
    if (!utente || !(await bcrypt.compare(password, utente.password)))
      return res.status(400).json({ message: "Username o password errati" });

    req.session.user = { id: utente._id, nome: utente.nome, username: utente.username };
    req.session.fingerprint = getFingerprint(req);
    res.json({ message: "Login riuscito", user: req.session.user });
  } catch {
    res.status(500).json({ message: "Errore server" });
  }
});

// Login Google
app.post("/auth/google", async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ message: "Token mancante" });

  try {
    const ticket = await client.verifyIdToken({ idToken: id_token, audience: CLIENT_ID });
    const payload = ticket.getPayload();

    let utente = await Utente.findOne({ username: payload.email });
    if (!utente) {
      utente = new Utente({
        nome: payload.name,
        username: payload.email,
        password: '',
        bio: '',
        profilePic: { data: null, contentType: null }
      });
      await utente.save();
    }

    req.session.user = { id: utente._id, nome: utente.nome, username: utente.username };
    req.session.fingerprint = getFingerprint(req);
    res.json({ message: "Login Google effettuato", user: req.session.user });
  } catch {
    res.status(401).json({ message: "Token non valido" });
  }
});

// Registrazione
app.post("/register", csrfProtection, async (req, res) => {
  const { nome, username, password } = req.body;
  if (!nome || !username || !password)
    return res.status(400).json({ message: "Dati mancanti" });

  try {
    if (await Utente.findOne({ username })) return res.status(400).json({ message: "Username già esistente" });

    const hash = await bcrypt.hash(password, 10);
    const nuovoUtente = new Utente({
      nome,
      username,
      password: hash,
      bio: '',
      profilePic: { data: null, contentType: null }
    });

    await nuovoUtente.save();
    res.status(201).json({ message: "Registrazione completata" });
  } catch (err) {
    res.status(500).json({ message: "Errore server" });
  }
});

// Upload immagine e bio
app.post("/api/update-profile", checkFingerprint, csrfProtection, upload.single("profilePic"), async (req, res) => {
  const userId = req.session.user.id;
  const updateData = {};
  if (req.body.bio) updateData.bio = req.body.bio;
  if (req.file) updateData.profilePic = { data: req.file.buffer, contentType: req.file.mimetype };

  try {
    const updated = await Utente.findByIdAndUpdate(userId, { $set: updateData }, { new: true });
    if (!updated) return res.status(404).json({ message: "Utente non trovato" });

    res.json({ message: "Profilo aggiornato" });
  } catch (err) {
    res.status(500).json({ message: "Errore salvataggio profilo" });
  }
});

// Foto profilo
app.get("/api/user-photo/:userId", async (req, res) => {
  try {
    const user = await Utente.findById(req.params.userId);
    if (user && user.profilePic?.data) {
      res.contentType(user.profilePic.contentType);
      res.send(user.profilePic.data);
    } else {
      res.status(404).send("Nessuna foto");
    }
  } catch {
    res.status(500).send("Errore");
  }
});

// Ricerca utenti
app.get("/api/search-users", checkFingerprint, async (req, res) => {
  const query = req.query.q;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!query) return res.status(400).json({ message: "Query mancante" });

  try {
    const results = await Utente.find({ username: new RegExp(query, 'i') }, 'username nome _id')
      .skip(skip)
      .limit(limit);

    res.json(results.map(u => ({
      id: u._id,
      username: u.username,
      nome: u.nome,
      profilePicUrl: `/api/user-photo/${u._id}`
    })));
  } catch {
    res.status(500).json({ message: "Errore ricerca" });
  }
});

// Visita utenti
app.post("/api/visit-user/:id", checkFingerprint, async (req, res) => {
  const userId = req.session.user.id;
  const visitedId = req.params.id;

  if (userId === visitedId) return res.status(400).json({ message: "Non puoi visitare te stesso" });

  try {
    const utente = await Utente.findById(userId);
    if (!utente) return res.status(404).json({ message: "Utente non trovato" });

    utente.utentiRecenti = utente.utentiRecenti.filter(id => id.toString() !== visitedId);
    utente.utentiRecenti.unshift(visitedId);
    utente.utentiRecenti = utente.utentiRecenti.slice(0, 5);

    await utente.save();
    res.json({ message: "Utente salvato come visitato" });
  } catch (err) {
    console.error("Errore salvataggio visitato:", err);
    res.status(500).json({ message: "Errore server" });
  }
});

// Ottieni utenti visti
app.get("/api/recent-users", checkFingerprint, async (req, res) => {
  try {
    const utente = await Utente.findById(req.session.user.id)
      .populate("utentiRecenti", "username nome _id")
      .exec();

    const recenti = utente.utentiRecenti.map(u => ({
      id: u._id,
      username: u.username,
      nome: u.nome,
      profilePicUrl: `/api/user-photo/${u._id}`
    }));

    res.json(recenti);
  } catch {
    res.status(500).json({ message: "Errore caricamento recenti" });
  }
});

// Lista follower
app.get("/api/user/:id/followers", checkFingerprint, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const user = await Utente.findById(req.params.id)
      .populate({
        path: "followers",
        select: "nome username _id",
        options: { skip, limit }
      });

    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    const total = user.followers.length;
    const list = user.followers.map(u => ({
      id: u._id,
      nome: u.nome,
      username: u.username,
      profilePicUrl: `/api/user-photo/${u._id}`
    }));

    res.json({ total, page, limit, followers: list });
  } catch {
    res.status(500).json({ message: "Errore nel recupero follower" });
  }
});

// Lista seguiti
app.get("/api/user/:id/following", checkFingerprint, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const user = await Utente.findById(req.params.id)
      .populate({
        path: "following",
        select: "nome username _id",
        options: { skip, limit }
      });

    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    const total = user.following.length;
    const list = user.following.map(u => ({
      id: u._id,
      nome: u.nome,
      username: u.username,
      profilePicUrl: `/api/user-photo/${u._id}`
    }));

    res.json({ total, page, limit, following: list });
  } catch {
    res.status(500).json({ message: "Errore nel recupero following" });
  }
});

// Profilo pubblico
app.get("/api/user-public/:id", async (req, res) => {
  try {
    const user = await Utente.findById(req.params.id).select("username nome bio followers following");
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    res.json({
      _id: user._id,
      username: user.username,
      nome: user.nome,
      bio: user.bio,
      followersCount: user.followers.length,
      followingCount: user.following.length
    });
  } catch {
    res.status(500).json({ message: "Errore server" });
  }
});

// Follow/Unfollow
app.post("/api/follow/:id", checkFingerprint, async (req, res) => {
  const followerId = req.session.user.id;
  const targetId = req.params.id;

  if (followerId === targetId)
    return res.status(400).json({ message: "Non puoi seguire te stesso" });

  try {
    const [follower, target] = await Promise.all([
      Utente.findById(followerId),
      Utente.findById(targetId)
    ]);
    if (!follower || !target)
      return res.status(404).json({ message: "Utente non trovato" });

    const isFollowing = follower.following.includes(target._id);
    if (isFollowing) {
      follower.following.pull(target._id);
      target.followers.pull(follower._id);
    } else {
      follower.following.addToSet(target._id);
      target.followers.addToSet(follower._id);
    }

    await Promise.all([follower.save(), target.save()]);
    res.json({
      following: !isFollowing,
      followersCount: target.followers.length,
      followingCount: follower.following.length
    });
  } catch (err) {
    console.error("Errore follow:", err);
    res.status(500).json({ message: "Errore follow" });
  }
});

// Follow-info
app.get("/api/follow-info/:id", checkFingerprint, async (req, res) => {
  const viewerId = req.session.user.id;
  const targetId = req.params.id;

  try {
    const [viewer, target] = await Promise.all([
      Utente.findById(viewerId),
      Utente.findById(targetId)
    ]);
    if (!target || !viewer) return res.status(404).json({ message: "Utente non trovato" });

    const isFollowing = viewer.following.includes(target._id);

    res.json({
      followersCount: target.followers.length,
      followingCount: target.following.length,
      isFollowing
    });
  } catch {
    res.status(500).json({ message: "Errore follow-info" });
  }
});

// Utente autenticato
app.get("/api/user", checkFingerprint, async (req, res) => {
  try {
    const user = await Utente.findById(req.session.user.id).select("username nome bio followers following");
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    res.json({
      _id: user._id,
      username: user.username,
      nome: user.nome,
      bio: user.bio,
      followersCount: user.followers.length,
      followingCount: user.following.length
    });
  } catch {
    res.status(500).json({ message: "Errore server" });
  }
});

// Logout
app.post("/logout", checkFingerprint, csrfProtection, (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: "Errore logout" });
    res.clearCookie("connect.sid");
    res.json({ message: "Logout effettuato" });
  });
});

// POST /api/posts, like, comment ecc. rimangono uguali al tuo codice originale

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Avvio server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server attivo su porta ${PORT}`);
});



