const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  ageMin: {
    type: Number,
    required: false
  },
  ageMax: {
    type: Number,
    required: false
  },
  weightMin: {
    type: Number,
    required: false
  },
  weightMax: {
    type: Number,
    required: false
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'mixed'],
    required: false
  },
  beltRanks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BeltRank'
  }],
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant'
  }],
  groups: [{
    name: String,
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Participant' }],
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }]
  }],
  matches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  }],
  bracketType: {
    type: String,
    enum: ['single_elimination', 'double_elimination', 'round_robin'],
    default: 'single_elimination'
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('Category', categorySchema);