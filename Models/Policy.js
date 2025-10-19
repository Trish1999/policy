const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PolicySchema = new Schema({
  policy_number: { type: String, required: true, index: true },
  policy_start_date: Date,
  policy_end_date: Date,
  policy_category_collection_id: { type: Schema.Types.ObjectId, ref: 'Lob' },
  company_collection_id: { type: Schema.Types.ObjectId, ref: 'Carrier' },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  account: { type: Schema.Types.ObjectId, ref: 'Account' },
  agent: { type: Schema.Types.ObjectId, ref: 'Agent' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Policy', PolicySchema);
