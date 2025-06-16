const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  message: String,
  name: String,
  timestamp: Date,
  uid: String
});

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  messages: {
    type: [messageSchema],
    default: []
  },
  lastMessageTimestamp: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('Rooms', roomSchema);



