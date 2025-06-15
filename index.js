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


//PARTE RICCARDO 9 
const path = require("path");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });





//FINE RICCARDO 9




const app = express();
app.set('trust proxy', 1);

// --- Funzione Fingerprint ---
function getFingerprint(req) {
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
      if (err) console.error("Errore distruggendo sessione:", err);
      return res.status(403).json({ message: "Sessione invalida, effettua di nuovo il login." });
    });
  } else {
    next();
  }
}

// --- Middleware ---
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
    maxAge: 1000 * 60 * 30,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const csrfProtection = csrf({ cookie: false });

// --- DB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connesso a MongoDB"))
  .catch(err => console.error("❌ Connessione fallita:", err));

// --- Schemi ---
const utenteSchema = new mongoose.Schema({
  nome: String,
  username: { type: String, unique: true },
  password: String,
  bio: String,
  profilePic: {
    data: Buffer,
    contentType: String
  },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Utente" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "Utente" }],
  utentiRecenti: [{ type: mongoose.Schema.Types.ObjectId, ref: "Utente" }]
});
const Utente = mongoose.model("Utente", utenteSchema);




//const storage = multer.memoryStorage();
//const upload = multer({ storage });


// prova salvataggio riccardo 9
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

//fine riccardo9

// --- Rotte ---
app.get("/csrf-token", (req, res, next) => {
  req.session.touch();
  next();
}, csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

// 🔐 Login tradizionale
app.post("/login", csrfProtection, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Dati mancanti" });

  try {
    const utente = await Utente.findOne({ username });
    if (!utente || !(await bcrypt.compare(password, utente.password)))
      return res.status(400).json({ message: "Username o password errati" });

    req.session.user = {
      id: utente._id,
      nome: utente.nome,
      username: utente.username
    };
    req.session.fingerprint = getFingerprint(req);

    res.status(200).json({ message: "Login riuscito", user: req.session.user });
  } catch (err) {
    res.status(500).json({ message: "Errore server" });
  }
});

// 🔐 Login con Google
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

    req.session.user = {
      id: utente._id,
      nome: utente.nome,
      username: utente.username
    };
    req.session.fingerprint = getFingerprint(req);

    res.json({ message: "Login Google effettuato", user: req.session.user });
  } catch (err) {
    console.error("Errore login Google:", err);
    res.status(401).json({ message: "Token non valido" });
  }
});

// 📝 Registrazione
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

// 📷 Upload immagine e bio
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

// 📸 Foto profilo
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

// 🔍 Ricerca utenti
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


//salva utente come visto

app.post("/api/visit-user/:id", checkFingerprint, async (req, res) => {
  const userId = req.session.user.id;
  const visitedId = req.params.id;

  if (userId === visitedId) return res.status(400).json({ message: "Non puoi visitare te stesso" });

  try {
    const utente = await Utente.findById(userId);
    if (!utente) return res.status(404).json({ message: "Utente non trovato" });

    // Rimuovi se già presente e metti in cima
    utente.utentiRecenti = utente.utentiRecenti.filter(id => id.toString() !== visitedId);
    utente.utentiRecenti.unshift(visitedId);

    // Limita a 5
    utente.utentiRecenti = utente.utentiRecenti.slice(0, 5);

    await utente.save();
    res.json({ message: "Utente salvato come visitato" });
  } catch (err) {
    console.error("Errore salvataggio visitato:", err);
    res.status(500).json({ message: "Errore server" });
  }
});

//ottieni utenti visti
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


// 🔽 Lista dei follower
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

    res.json({
      total,
      page,
      limit,
      followers: list
    });
  } catch {
    res.status(500).json({ message: "Errore nel recupero follower" });
  }
});


// 🔼 Lista dei seguiti
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

    res.json({
      total,
      page,
      limit,
      following: list
    });
  } catch {
    res.status(500).json({ message: "Errore nel recupero following" });
  }
});






// 👤 Profilo pubblico
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


// ➕➖ Follow/Unfollow
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


// ℹ️ Info follow
app.get("/api/follow-info/:id", checkFingerprint, async (req, res) => {
  const viewerId = req.session.user.id;
  const targetId = req.params.id;

  try {
    const [viewer, target] = await Promise.all([
      Utente.findById(viewerId),
      Utente.findById(targetId)
    ]);
    if (!target) return res.status(404).json({ message: "Utente non trovato" });
    if (!viewer) return res.status(404).json({ message: "Utente viewer non trovato" });

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


// 👤 Utente autenticato
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

// 🚪 Logout
app.post("/logout", checkFingerprint, csrfProtection, (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: "Errore logout" });
    res.clearCookie("connect.sid");
    res.json({ message: "Logout effettuato" });
  });
});

// POST RICCARDO 9
//app.post("/api/posts", checkFingerprint, upload.single("image"), async (req, res) => {
//  try {
//    const newPost = new Post({
//      userId: req.session.user.id,
//      desc: req.body.desc,
//      image: req.file ? {
 //       data: req.file.buffer,
//        contentType: req.file.mimetype
//      } : null,
//      likes: [],
//      comments: []
//    });

//    await newPost.save();
//    res.status(201).json({ message: "Post creato con successo" });
//  } catch (err) {
//    console.error("Errore creazione post:", err);
//    res.status(500).json({ message: "Errore creazione post" });
//  }
//});


app.post("/api/posts", checkFingerprint, upload.single("image"), async (req, res) => {
  try {
    const newPost = new Post({
      userId: req.session.user.id,
      desc: req.body.desc,
      image: req.file ? {
        data: req.file.buffer,
        contentType: req.file.mimetype
      } : null,
      likes: [],
      comments: []
    });

    await newPost.save();
    res.status(201).json({ message: "Post creato con successo" });
  } catch (err) {
    console.error("Errore creazione post:", err);
    res.status(500).json({ message: "Errore creazione post" });
  }
});






// === SCHEMA POST ===
// const postSchema = new mongoose.Schema({
//  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Utente" },
 // desc: String,
 // image: {
  //  data: Buffer,
 //   contentType: String
//  },
//  createdAt: { type: Date, default: Date.now },
//  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Utente" }],
 // comments: [
 //   {
 //     userId: { type: mongoose.Schema.Types.ObjectId, ref: "Utente" },
 //     text: String,
 //     createdAt: { type: Date, default: Date.now }
  //  }
//  ]
//});
const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Utente" },
  desc: String,
  image: {
    path: Buffer,
    contentType: String
  },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Utente" }],
  comments: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "Utente" },
      text: String,
      createdAt: { type: Date, default: Date.now }
    }
  ]
});


const Post = mongoose.model("Post", postSchema);

//app.get("/api/posts", async (req, res) => {
 // try {
  //  const posts = await Post.find()
//      .sort({ createdAt: -1 })
 //     .populate("userId", "username nome");

 //   res.json(posts.map(post => ({
     // _id: post._id,
      //userId: post.userId.username,
    //  desc: post.desc,
    //  createdAt: post.createdAt,
     // imageUrl: post.image?.data
      //  ? `/api/post-image/${post._id}`
      //  : null,
      //likes: post.likes.length,
      //comments: post.comments.length
    //})));
  //} catch {
  //  res.status(500).json({ message: "Errore caricamento post" });
//  }
//});
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("userId", "username nome");

    res.json(posts.map(post => ({
      _id: post._id,
      userId: post.userId.username,
      desc: post.desc,
      createdAt: post.createdAt,
      imageUrl: post.image?.data ? `/api/post-image/${post._id}` : null,
      likes: post.likes.length,
      comments: post.comments.length
    })));
  } catch {
    res.status(500).json({ message: "Errore caricamento post" });
  }
});



app.get("/api/post-image/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post?.image?.data) {
      res.contentType(post.image.contentType);
      res.send(post.image.data);
    } else {
      res.status(404).send("Nessuna immagine");
    }
  } catch {
    res.status(500).send("Errore immagine");
  }
});


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home9.html"));
});


/////////FINE POST RICCARDO

















// --- Avvio server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server attivo su porta ${PORT}`);
});
