const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  round: {
    type: Number,
    required: true
  },
  matchNumber: {
    type: Number,
    required: true
  },
  participant1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant'
  },
  participant2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant'
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    default: null
  },
  score1: {
    type: Number,
    default: 0
  },
  score2: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'ongoing', 'completed', 'cancelled'],
    default: 'pending'
  }
});

module.exports = mongoose.model('Match', matchSchema);