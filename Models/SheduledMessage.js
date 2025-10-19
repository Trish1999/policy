const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ScheduledMessageSchema = new Schema({
  message: { type: String, required: true },
  runAt: { type: Date, required: true },
  done: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScheduledMessage', ScheduledMessageSchema);
