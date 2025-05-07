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
  beltRanks: {
    type: [String],
    required: false
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: false
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant'
  }]
});

module.exports = mongoose.model('Category', categorySchema);