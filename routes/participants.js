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
    
    console.log('=== ADD PARTICIPANT REQUEST ===');
    console.log('Full req.body:', JSON.stringify(req.body, null, 2));
    console.log('Available keys:', Object.keys(req.body));
    
    const { firstName, lastName, dateOfBirth, gender, weight, beltRank } = req.body;
    
    console.log('Destructured values:');
    console.log('  firstName:', firstName);
    console.log('  lastName:', lastName);
    console.log('  dateOfBirth:', dateOfBirth);
    console.log('  gender:', gender);
    console.log('  weight:', weight);
    console.log('  beltRank:', beltRank);
    
    // Find the belt rank by the rank string
    const beltRankDoc = await BeltRank.findOne({ rank: beltRank });
    console.log('Looking for belt rank:', beltRank);
    console.log('Found belt rank doc:', beltRankDoc);
    
    if (!beltRankDoc) {
      console.log('Belt rank not found! Available belt ranks:');
      const allRanks = await BeltRank.find();
      allRanks.forEach(r => console.log(`  - ${r.rank}`));
      return res.status(400).send('Invalid belt rank');
    }
    
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).send('Tournament not found');
    }
    
    const newParticipant = new Participant({
      firstName,
      lastName,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      weight: Number.parseFloat(weight),
      beltRank: beltRankDoc._id,
      club: clubId,
      tournament: tournamentId
    });
    
    await newParticipant.save();
    
    // Add participant to club's participants list
    const club = await Club.findById(clubId);
    if (club) {
      club.participants.push(newParticipant._id);
      await club.save();
    }
    
    // Populate beltRank for assignment function
    await newParticipant.populate('beltRank');
    
    // Auto-assign participant to matching category
    const tournamentManagementController = require('../controllers/tournamentManagementController');
    await tournamentManagementController.assignParticipantToCategory(newParticipant, tournament);
    
    res.redirect(`/tournaments/${tournamentId}/club/${clubId}`);
  } catch (error) {
    console.error('Error registering participant:', error);
    res.status(500).send('Error registering participant');
  }
});

// Show edit participant form
router.get('/tournaments/:tournamentId/clubs/:clubId/participants/:participantId/edit', authMiddleware, async (req, res) => {
  try {
    const { tournamentId, clubId, participantId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    const club = await Club.findById(clubId);
    const participant = await Participant.findById(participantId).populate('beltRank');
    const beltRanks = await BeltRank.find().sort({ order: 1 });
    
    if (!tournament || !club || !participant) {
      return res.status(404).send('Tournament, club, or participant not found');
    }
    
    res.render('participants/edit', { tournament, club, participant, beltRanks });
  } catch (error) {
    console.error('Error fetching edit form:', error);
    res.status(500).send('Server error');
  }
});

// Handle participant update
router.put('/tournaments/:tournamentId/clubs/:clubId/participants/:participantId', authMiddleware, async (req, res) => {
  try {
    const { tournamentId, clubId, participantId } = req.params;
    const { firstName, lastName, dateOfBirth, gender, weight, beltRank } = req.body;
    
    // Find the belt rank by the rank string
    const beltRankDoc = await BeltRank.findOne({ rank: beltRank });
    
    if (!beltRankDoc) {
      return res.status(400).send('Invalid belt rank');
    }
    
    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).send('Participant not found');
    }
    
    // Update participant
    participant.firstName = firstName;
    participant.lastName = lastName;
    participant.dateOfBirth = new Date(dateOfBirth);
    participant.gender = gender;
    participant.weight = Number.parseFloat(weight);
    participant.beltRank = beltRankDoc._id;
    
    await participant.save();
    
    // Re-assign to category if needed (in case belt rank or age changed)
    const tournament = await Tournament.findById(tournamentId);
    await participant.populate('beltRank');
    
    const tournamentManagementController = require('../controllers/tournamentManagementController');
    await tournamentManagementController.assignParticipantToCategory(participant, tournament);
    
    res.redirect(`/tournaments/${tournamentId}/club/${clubId}`);
  } catch (error) {
    console.error('Error updating participant:', error);
    res.status(500).send('Error updating participant');
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

// Delete participant
router.delete('/tournaments/:tournamentId/clubs/:clubId/participants/:participantId', authMiddleware, async (req, res) => {
  try {
    const { tournamentId, clubId, participantId } = req.params;
    
    // Find and delete the participant
    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    
    // Remove from club's participants array
    await Club.findByIdAndUpdate(clubId, {
      $pull: { participants: participantId }
    });
    
    // Remove from category's participants array if assigned
    if (participant.category) {
      await require('../models/Category').findByIdAndUpdate(participant.category, {
        $pull: { participants: participantId }
      });
    }
    
    // Delete the participant
    await Participant.findByIdAndDelete(participantId);
    
    // Redirect back to club page
    res.redirect(`/tournaments/${tournamentId}/club/${clubId}`);
  } catch (error) {
    console.error('Error deleting participant:', error);
    res.status(500).json({ error: 'Error deleting participant' });
  }
});

module.exports = router;