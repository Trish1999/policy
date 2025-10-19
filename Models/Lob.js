const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LobSchema = new Schema({
  category_name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lob', LobSchema);
