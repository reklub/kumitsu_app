const mongoose = require('mongoose');

const BeltRankSchema = new mongoose.Schema({
  rank: {
    type: String,
    required: true,
    unique: true
  },
  color: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  description: String
});

module.exports = mongoose.model('BeltRank', BeltRankSchema);
