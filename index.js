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
const helmet = require("helmet");
const morgan = require("morgan");
const { OAuth2Client } = require("google-auth-library");

// Rotte modulari
const userRoute = require("./public/routes/users");
const authRoute = require("./public/routes/auth");
const postRoute = require("./public/routes/posts");

const CLIENT_ID = '42592859457-ausft7g5gohk7mf96st2047ul9rk8o0v.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

const app = express();
app.set('trust proxy', 1);

// 📦 Middleware comuni
app.use(helmet());
app.use(morgan("common"));
app.use(cors({
  origin: 'https://bepoli.onrender.com',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// 🍪 Sessione + CSRF
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge: 1000 * 60 * 30,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

const csrfProtection = csrf({ cookie: false });

// 🔐 Fingerprint
function getFingerprint(req) {
  const ip = req.ip || req.connection.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  return `${ip}|${ua}`;
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
      if (err) console.error('Errore distruggendo sessione:', err);
      return res.status(403).json({ message: "Sessione invalida, effettua di nuovo il login." });
    });
  } else {
    next();
  }
}

// 🛢️ Connessioni multiple a DB
const mainDb = mongoose.createConnection(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const socialDb = mongoose.createConnection(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mainDb.once('open', () => console.log("✅ Connesso a DB principale"));
socialDb.once('open', () => console.log("✅ Connesso a DB social"));

mainDb.on('error', err => console.error("❌ Errore DB principale:", err));
socialDb.on('error', err => console.error("❌ Errore DB social:", err));

// 👤 Schema Utente (DB principale)
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

const Utente = mainDb.model("Utente", utenteSchema);

// 📷 Multer upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 🔒 CSRF token init
app.get("/csrf-token", (req, res, next) => {
  req.session.touch();
  next();
}, csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// 🌐 Pagine statiche
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

    res.status(200).json({ message: "Login effettuato", user: req.session.user });
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

// 🔐 Google login
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

    res.status(200).json({ message: 'Login Google effettuato', user: req.session.user });
  } catch (error) {
    console.error('Errore verifica token Google:', error);
    res.status(401).json({ message: 'Token Google non valido' });
  }
});

// ✏️ Aggiorna profilo
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
    res.status(500).send("Errore server");
  }
});

// 🙋‍♂️ Dati utente autenticato
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

// 🔗 Monta rotte social col db secondario
app.use("/api/users", userRoute(socialDb));
app.use("/api/auth", authRoute(socialDb));
app.use("/api/posts", postRoute(socialDb));


// --- SERVER ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server in ascolto su porta ${PORT}`);
});

