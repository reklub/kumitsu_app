const express = require('express');
const Participant = require('../models/Participant');
const Club = require('../models/Club');
const Tournament = require('../models/Tournament');
const router = express.Router();

// Show participant registration form
router.get('/tournaments/:tournamentId/clubs/:clubId/add-participant', async (req, res) => {
  try {
    const { tournamentId, clubId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    const club = await Club.findById(clubId);
    
    if (!tournament || !club) {
      return res.status(404).send('Tournament or club not found');
    }
    
    res.render('participants/new', { tournament, club });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Server error');
  }
});

// Handle participant registration
router.post('/tournaments/:tournamentId/clubs/:clubId/add-participant', async (req, res) => {
  try {
    const { tournamentId, clubId } = req.params;
    const { firstName, lastName, dateOfBirth, gender, weight, beltRank } = req.body;
    
    const newParticipant = new Participant({
      firstName,
      lastName,
      dateOfBirth,
      gender,
      weight,
      beltRank,
      club: clubId,
      //tournament: tournamentId
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
    });
    
    if (!tournament || !club) {
      return res.status(404).send('Tournament or club not found');
    }
    
    res.render('participants/index', { tournament, club, participants });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;