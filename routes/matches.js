const express = require('express');
const Match = require('../models/Match');
const Category = require('../models/Category');
const Tournament = require('../models/Tournament');
const Participant = require('../models/Participant');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// View brackets for a category
router.get('/tournaments/:tournamentId/categories/:categoryId/brackets', async (req, res) => {
  try {
    const { tournamentId, categoryId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    const category = await Category.findById(categoryId).populate('participants');
    const matches = await Match.find({ 
      tournament: tournamentId, 
      category: categoryId 
    }).populate('participant1 participant2 winner');
    
    if (!tournament || !category) {
      return res.status(404).send('Tournament or category not found');
    }
    
    // Organize matches by rounds for the view
    const rounds = {};
    matches.forEach(match => {
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      rounds[match.round].push(match);
    });
    
    res.render('matches/brackets', { tournament, category, rounds });
  } catch (error) {
    console.error('Error fetching brackets:', error);
    res.status(500).send('Server error');
  }
});

// Generate brackets for a category
router.post('/tournaments/:tournamentId/categories/:categoryId/generate-brackets', authMiddleware, async (req, res) => {
  try {
    const { tournamentId, categoryId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    const category = await Category.findById(categoryId).populate('participants');
    
    if (!tournament || !category) {
      return res.status(404).send('Tournament or category not found');
    }
    
    // Check if user is the tournament organizer
    if (tournament.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).send('Unauthorized');
    }
    
    // Clear any existing matches for this category
    await Match.deleteMany({ tournament: tournamentId, category: categoryId });
    
    // Shuffle participants for random seeding
    const participants = [...category.participants];
    shuffleArray(participants);
    
    // Generate tournament bracket (single elimination)
    const numParticipants = participants.length;
    
    // Calculate number of rounds needed
    const numRounds = Math.ceil(Math.log2(numParticipants));
    
    // Calculate total number of matches needed (2^n - 1)
    const totalMatches = Math.pow(2, numRounds) - 1;
    
    // Generate bye matches as needed
    const totalSlots = Math.pow(2, numRounds);
    const numByes = totalSlots - numParticipants;
    
    // Create all matches structure first
    const matches = [];
    
    // Global match counter for continuous numbering across all phases
    let globalMatchNumber = 1;
    
    // First round with participants and byes
    for (let i = 0; i < totalSlots / 2; i++) {
      const match = new Match({
        tournament: tournamentId,
        category: categoryId,
        round: 1,
        matchNumber: globalMatchNumber++
      });
      
      // Assign participants to first round matches
      if (i < participants.length) {
        match.participant1 = participants[i]._id;
      }
      
      // If we still have participants and this isn't a bye match
      if (i + totalSlots / 2 < participants.length && i >= numByes / 2) {
        match.participant2 = participants[i + totalSlots / 2 - numByes / 2]._id;
      }
      
      // If this is a bye match, set winner automatically
      if (match.participant1 && !match.participant2) {
        match.winner = match.participant1;
        match.status = 'completed';
      }
      
      matches.push(match);
    }
    
    // Create remaining rounds structure - REVERSED ORDER (finals first, then semi-finals, etc.)
    // This ensures match numbers go from early rounds to finals
    const roundMatches = {};
    let prevRoundMatches = totalSlots / 2;
    for (let round = 2; round <= numRounds; round++) {
      const currentRoundMatches = prevRoundMatches / 2;
      roundMatches[round] = currentRoundMatches;
      prevRoundMatches = currentRoundMatches;
    }
    
    // Add matches for rounds 2 to numRounds with continuous numbering
    prevRoundMatches = totalSlots / 2;
    for (let round = 2; round <= numRounds; round++) {
      const currentRoundMatches = prevRoundMatches / 2;
      
      for (let i = 0; i < currentRoundMatches; i++) {
        const match = new Match({
          tournament: tournamentId,
          category: categoryId,
          round: round,
          matchNumber: globalMatchNumber++
        });
        
        matches.push(match);
      }
      
      prevRoundMatches = currentRoundMatches;
    }
    
    // Save all matches
    await Match.insertMany(matches);
    
    res.redirect(`/tournaments/${tournamentId}/categories/${categoryId}/brackets`);
  } catch (error) {
    console.error('Error generating brackets:', error);
    res.status(500).send('Error generating brackets');
  }
});

// Update match result
router.post('/matches/:matchId/update', authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { score1, score2, winner } = req.body;
    
    const match = await Match.findById(matchId);
    
    if (!match) {
      return res.status(404).send('Match not found');
    }
    
    const tournament = await Tournament.findById(match.tournament);
    
    // Check if user is the tournament organizer
    if (tournament.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).send('Unauthorized');
    }
    
    // Update match scores
    match.score1 = score1;
    match.score2 = score2;
    match.winner = winner;
    match.status = 'completed';
    
    await match.save();
    
    // Find the next match where this winner should advance
    const nextRound = match.round + 1;
    const matchesPerRound = Math.pow(2, Math.ceil(Math.log2(match.matchNumber)) - match.round);
    const nextMatchNumber = Math.floor((match.matchNumber - 1) / 2) + 1 + matchesPerRound;
    
    const nextMatch = await Match.findOne({ 
      tournament: match.tournament,
      category: match.category,
      round: nextRound,
      matchNumber: nextMatchNumber
    });
    
    // If there's a next match, advance the winner
    if (nextMatch) {
      // Determine if winner goes to participant1 or participant2 slot
      if (match.matchNumber % 2 === 1) {
        nextMatch.participant1 = match.winner;
      } else {
        nextMatch.participant2 = match.winner;
      }
      
      await nextMatch.save();
    }
    
    // Redirect back to brackets view
    res.redirect(`/tournaments/${match.tournament}/categories/${match.category}/brackets`);
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).send('Error updating match');
  }
});

// Helper function to shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports = router;