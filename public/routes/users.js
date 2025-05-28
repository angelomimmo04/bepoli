const router = require("express").Router();


router.get("/",(req,res)=>{
    res.send("hey user route")
})


module.exports =router