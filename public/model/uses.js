const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
    username{
        type:String;
        require:true,
        min:3,
        max:20,
        unique=true
    }
})