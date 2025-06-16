const mongoose = require('mongoose');

const bepolibySchema = new mongoose.Schema({
  message: { type: String, required: true },
  name: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  uid: { type: String, required: true }
}, { timestamps: true });

// forza il nome della collezione a "messagecontents"
module.exports = mongoose.model('Message', bepolibySchema, 'messagecontents');

