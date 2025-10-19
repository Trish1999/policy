const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CarrierSchema = new Schema({
  company_name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Carrier', CarrierSchema);
