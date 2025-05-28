const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require ("dotenv");
const helmet = require ("helmet");
const morgan = require ("morgan");


const userRoute = require ("./routes/users");
const authRoute = require ("./routes/auth");
const postRoute = require ("./routes/posts");





dotenv.config();

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connesso al DB");
  } catch (err) {
    console.error("❌ Errore nella connessione al DB:", err);
  }
};

startServer();



app.use(express.json());

app.use(helmet());

app.use(morgan("common"));





app.use("/api/user" , userRoute);


app.use("/api/auth", postRoute);


app.use("/api/posts", postRoute);


app.listen(8800,()=>{
    console.log ("backend server is running")
})