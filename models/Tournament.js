const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  clubs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Club" }]
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;
