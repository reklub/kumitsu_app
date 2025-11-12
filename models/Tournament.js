const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  registrationStartDate: {
    type: Date,
    required: true
  },
  registrationEndDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  location: {
    type: String,
    required: true
  },
  rank: {
    type: String,
    required: false
  },
  ticketPrice: {
    type: Number,
    required: false,
    default: 0
  },
  startTime: {
    type: String,
    required: false
  },
  endTime: {
    type: String,
    required: false
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  clubs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Club" }],
  tournamentType: {
    type: String,
    enum: ['single_elimination', 'double_elimination', 'round_robin', 'swiss'],
    default: 'single_elimination'
  },
  maxParticipants: Number,
  groups: [{
    name: String,
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Participant' }]
  }],
  brackets: {
    type: mongoose.Schema.Types.Mixed, // Struktura drabinek
    default: {}
  },
  matches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  }],
  images: [{
    url: String,
    filename: String
  }]
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;
