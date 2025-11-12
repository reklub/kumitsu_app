const express = require('express');
const Participant = require('../models/Participant');
const Club = require('../models/Club');
const Tournament = require('../models/Tournament');
const BeltRank = require('../models/BeltRank');
const { getGenderText } = require('../utils/tournamentHelpers');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// Show participant registration form
router.get('/tournaments/:tournamentId/clubs/:clubId/add-participant', authMiddleware, async (req, res) => {
  try {
    const { tournamentId, clubId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    const club = await Club.findById(clubId);
    const beltRanks = await BeltRank.find().sort({ order: 1 });
    
    if (!tournament || !club) {
      return res.status(404).send('Tournament or club not found');
    }
    
    res.render('participants/new', { tournament, club, beltRanks });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Server error');
  }
});

// Handle participant registration
router.post('/tournaments/:tournamentId/clubs/:clubId/add-participant', authMiddleware, async (req, res) => {
  try {
    const { tournamentId, clubId } = req.params;
    const { firstName, lastName, dateOfBirth, gender, weight, beltRank } = req.body;
    
    // Find the belt rank by the rank string
    const beltRankDoc = await BeltRank.findOne({ rank: beltRank });
    if (!beltRankDoc) {
      return res.status(400).send('Invalid belt rank');
    }
    
    const newParticipant = new Participant({
      firstName,
      lastName,
      dateOfBirth,
      gender,
      weight,
      beltRank: beltRankDoc._id,
      club: clubId,
      tournament: tournamentId
    });
    
    await newParticipant.save();
    
    res.redirect(`/tournaments/${tournamentId}/clubs/${clubId}`);
  } catch (error) {
    console.error('Error registering participant:', error);
    res.status(500).send('Error registering participant');
  }
});

// List all participants for a club in a tournament
router.get('/tournaments/:tournamentId/clubs/:clubId', async (req, res) => {
  try {
    const { tournamentId, clubId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    const club = await Club.findById(clubId);
    const participants = await Participant.find({ 
      tournament: tournamentId, 
      club: clubId 
    }).populate('beltRank');
    
    if (!tournament || !club) {
      return res.status(404).send('Tournament or club not found');
    }
    
    res.render('participants/index', { tournament, club, participants, getGenderText });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;