const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AgentSchema = new Schema({
  agent: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Agent', AgentSchema);
