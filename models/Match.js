const mongoose = require('mongoose');

// models/Match.js
const MatchSchema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  round: String,
  matchNumber: Number,
  participant1: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' },
  participant2: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' },
  score1: { type: Number, default: 0 },
  score2: { type: Number, default: 0 },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  court: String,
  scheduledTime: Date,
  actualStartTime: Date,
  actualEndTime: Date
});

module.exports = mongoose.model('Match', matchSchema);