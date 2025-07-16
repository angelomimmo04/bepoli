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






const jwt = require('jsonwebtoken');












const storage = multer.memoryStorage();
const upload = multer({ storage });


const app = express();
app.set('trust proxy', 1);
app.use(express.static(path.join(__dirname, 'public')));


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

// Middleware 
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

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

// DB 
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connesso a MongoDB"))
  .catch(err => console.error("Connessione fallita:", err));

// Schemi 
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



// Rotte Questo fa sì che la pagina di login sia la prima cosa che gli utenti vedono quando accedono all'applicazione
app.get("/csrf-token", (req, res, next) => {
  req.session.touch();
  next();
}, csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});



//PASSAGGIO DATI 
app.get("/api/auth-token", checkFingerprint, (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: "Non autenticato" });

  const payload = {
    id: req.session.user.id,
    username: req.session.user.username,
    nome: req.session.user.nome
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "15m" // valido per 15 minuti
  });

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

// Login con Google
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


// salva utente come visto

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


// Lista dei follower
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


// Lista dei seguiti
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


// ℹInfo follow
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

// POST 


app.post('/api/posts', upload.single("image"), async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Utente non autenticato" });
    }

    const location = req.body.location || "Posizione sconosciuta";

    console.log("Ricevuto post da frontend:", {
      location: location,
      desc: req.body.desc
    });

    const newPost = new Post({
      userId,
      desc: req.body.desc,
      location, // salva qui la posizione ricevuta
      createdAt: new Date(),
      image: req.file ? {
        data: req.file.buffer,
        contentType: req.file.mimetype
      } : null
    });

    await newPost.save();
    res.status(201).json(newPost);

  } catch (error) {
    console.error("Errore creazione post:", error);
    res.status(500).json({ message: "Errore del server" });
  }
});




// SCHEMA POST 
const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Utente" },
  desc: String,
  image: {
    data: Buffer,
    contentType: String
  },
  location: String, // AGGIUNTO CAMPO POSIZIONE
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


app.get("/api/posts", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = 10;
  const location = req.query.location || "Fuori dalle aree conosciute";

  // Normalizza il nome base
  let baseLocationName;
  if (location.startsWith("Vicino a: ")) {
    baseLocationName = location.replace("Vicino a: ", "");
  } else {
    baseLocationName = location;
  }

  // Cerchereemo sia la versione base sia la versione "Vicino a ..."
  const locationsToFind = [baseLocationName, "Vicino a: " + baseLocationName];

  try {
    const query = { location: { $in: locationsToFind } };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("userId", "username nome _id")
      .populate("comments.userId", "username nome");

    return res.json(posts.map(post => ({
      _id: post._id,
      userId: {
        _id: post.userId._id,
        username: post.userId.username,
        nome: post.userId.nome
      },
      desc: post.desc,
      location: post.location,
      createdAt: post.createdAt,
      imageUrl: post.image?.data ? `/api/post-image/${post._id}` : null,
      likes: post.likes.length,
      comments: post.comments.length,
      commentsData: post.comments.map(comment => ({
        text: comment.text,
        createdAt: comment.createdAt,
        userId: {
          username: comment.userId?.username,
          nome: comment.userId?.nome
        }
      }))
    })));

  } catch (err) {
    if (
      err.code === 292 ||
      err.codeName === "QueryExceededMemoryLimitNoDiskUseAllowed" ||
      err.message.includes("Sort exceeded memory limit")
    ) {
      try {
        const aggPipeline = [
          { $match: { location: { $in: locationsToFind } } },
          { $sort: { createdAt: -1 } },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          {
            $lookup: {
              from: 'utentes',
              localField: 'userId',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: '$user' },
          {
            $lookup: {
              from: 'utentes',
              localField: 'comments.userId',
              foreignField: '_id',
              as: 'commentUsers'
            }
          },
          {
            $addFields: {
              comments: {
                $map: {
                  input: '$comments',
                  as: 'comment',
                  in: {
                    $mergeObjects: [
                      '$$comment',
                      {
                        user: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$commentUsers',
                                cond: { $eq: ['$$this._id', '$$comment.userId'] }
                              }
                            },
                            0
                          ]
                        }
                      }
                    ]
                  }
                }
              }
            }
          },
          { $project: { commentUsers: 0 } }
        ];

        const posts = await Post.aggregate(aggPipeline).allowDiskUse(true);

        const formattedPosts = posts.map(post => ({
          _id: post._id,
          userId: {
            _id: post.user._id,
            username: post.user.username,
            nome: post.user.nome
          },
          desc: post.desc,
          location: post.location,
          createdAt: post.createdAt,
          imageUrl: post.image?.data ? `/api/post-image/${post._id}` : null,
          likes: post.likes.length,
          comments: post.comments.length,
          commentsData: post.comments.map(comment => ({
            text: comment.text,
            createdAt: comment.createdAt,
            userId: {
              username: comment.user?.username,
              nome: comment.user?.nome
            }
          }))
        }));

        return res.json(formattedPosts);
      } catch (aggErr) {
        console.error("Errore fallback aggregate:", aggErr);
        return res.status(500).json({ message: "Errore caricamento post" });
      }
    }

    console.error("Errore caricamento post:", err);
    return res.status(500).json({ message: "Errore caricamento post" });
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
  res.sendFile(path.join(__dirname, "public", "home.html"));
});



// Like al post
app.post("/api/posts/:id/like", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post non trovato" });

    const userId = req.session.user.id;
    const index = post.likes.indexOf(userId);

    if (index === -1) {
      post.likes.push(userId); // aggiunge il like
    } else {
      post.likes.splice(index, 1); // toglie il like
    }

    await post.save();
    res.json({ likes: post.likes.length });
  } catch (err) {
    console.error("Errore nel like:", err);
    res.status(500).json({ message: "Errore like" });
  }
});



// Commenta un post
app.post("/api/posts/:id/comment", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post non trovato" });

    const newComment = {
      text: req.body.text,
      userId: req.session.user.id,
      createdAt: new Date()
    };

    post.comments.push(newComment);
    await post.save();

    const lastComment = post.comments[post.comments.length - 1];

    const populated = await Post.populate(lastComment, {
      path: "userId",
      select: "nome username"
    });

    res.json({
      comments: post.comments.length,
      newComment: populated
    });
  } catch (err) {
    console.error("Errore commento:", err);
    res.status(500).json({ message: "Errore commento" });
  }
});

app.get("/api/posts/:id/comments", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('comments.userId', 'nome username');

    if (!post) return res.status(404).json({ message: "Post non trovato" });

    res.json(post.comments);
  } catch (err) {
    console.error("Errore caricamento commenti:", err);
    res.status(500).json({ message: "Errore commenti" });
  }
});






// FINE POST 






app.get("/api/user/:id/posts", checkFingerprint, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .populate("userId", "username nome _id")
      .populate("comments.userId", "username nome");

    res.json(posts.map(post => ({
      _id: post._id,
      userId: {
        _id: post.userId._id,
        username: post.userId.username,
        nome: post.userId.nome
      },
      desc: post.desc,
      createdAt: post.createdAt,
      imageUrl: post.image?.data ? `/api/post-image/${post._id}` : null,
      likes: post.likes.length,
      comments: post.comments.length,
      commentsData: post.comments.map(comment => ({
        text: comment.text,
        createdAt: comment.createdAt,
        userId: {
          username: comment.userId?.username,
          nome: comment.userId?.nome
        }
      }))
    })));
  } catch (err) {
    console.error("Errore caricamento post utente:", err);
    res.status(500).json({ message: "Errore caricamento post utente" });
  }
});











// Avvio server 
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server attivo su porta ${PORT}`);
});
