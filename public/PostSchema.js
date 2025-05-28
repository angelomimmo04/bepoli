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
            type: string
        },
        likes: {
            type: Array,
            default: []
        },
    },

    { timestamps: true }

);
