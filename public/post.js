const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
        },
        desc: {
            type: String,
            max: 500,
        },
        Image: {
            type: String
        },
        likes: {
            type: Array,
            default: []
        },
    },

    { timestamps: true }

);
module.exports = mongoose.model("post",PostSchema);