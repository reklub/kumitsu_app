const Tournament = require('../models/Tournament');
const Category = require('../models/Category');
const Match = require('../models/Match');
const Participant = require('../models/Participant');
const { BracketsManager } = require('brackets-manager');
const { JsonDatabase } = require('brackets-json-db');
const { getBeltColors, getAllBeltRanks, getGenderText } = require('../utils/tournamentHelpers');

// Helper function to generate single elimination bracket
function generateSingleEliminationBracket(participants, tournamentId, categoryId) {
  const matches = [];
  const numParticipants = participants.length;
  const numRounds = Math.ceil(Math.log2(numParticipants));
  const totalSlots = Math.pow(2, numRounds);
  const numByes = totalSlots - numParticipants;
  
  // Shuffle participants for random seeding
  const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
  
  // Create first round matches
  let matchNumber = 1;
  for (let i = 0; i < totalSlots / 2; i++) {
    const participant1 = i < numParticipants ? shuffledParticipants[i] : null;
    const participant2 = (i + totalSlots / 2) < numParticipants ? shuffledParticipants[i + totalSlots / 2] : null;
    
    const match = new Match({
      tournament: tournamentId,
      category: categoryId,
      round: 1,
      matchNumber: matchNumber++,
      participant1: participant1 ? participant1._id : null,
      participant2: participant2 ? participant2._id : null,
      status: 'scheduled',
      winner: null
    });
    
    matches.push(match);
  }
  
  return matches;
}

// Helper function to generate round robin matches
function generateRoundRobinMatches(participants, tournamentId, categoryId) {
  const matches = [];
  const numParticipants = participants.length;
  let matchNumber = 1;
  
  // Generate all possible pairings
  for (let i = 0; i < numParticipants; i++) {
    for (let j = i + 1; j < numParticipants; j++) {
      const match = new Match({
        tournament: tournamentId,
        category: categoryId,
        round: 1,
        matchNumber: matchNumber++,
        participant1: participants[i]._id,
        participant2: participants[j]._id,
        status: 'scheduled',
        winner: null
      });
      
      matches.push(match);
    }
  }
  
  return matches;
}

// Create a tournament
exports.createTournament = async (req, res) => {
  const { name, startDate, endDate, registrationStart, registrationEnd, description, location, organizer, status } = req.body;
  
  try {
    const tournament = new Tournament({
      name,
      startDate,
      endDate,
      registrationStart,
      registrationEnd,
      description,
      location,
      organizer: req.user._id,
    });

    await tournament.save();
    res.status(201).json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Error creating tournament' });
  }
};

// Get all tournaments
exports.getTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find().populate('organizer', 'name email');
    res.status(200).json(tournaments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tournaments' });
  }
};

// Get a specific tournament
exports.getTournament = async (req, res) => {
  const { id } = req.params;
  
  try {
    const tournament = await Tournament.findById(id).populate('organizer', 'name email');
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.status(200).json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tournament' });
  }
};

// Update a tournament
exports.updateTournament = async (req, res) => {
  const { id } = req.params;
  const { name, startDate, endDate, location } = req.body;
  
  try {
    const tournament = await Tournament.findByIdAndUpdate(id, {
      name,
      startDate,
      endDate,
      location
    }, { new: true });

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.status(200).json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Error updating tournament' });
  }
};

// Delete a tournament
exports.deleteTournament = async (req, res) => {
  const { id } = req.params;
  
  try {
    const tournament = await Tournament.findByIdAndDelete(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.status(200).json({ message: 'Tournament deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting tournament' });
  }
};


exports.generateGroups = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('participants');
    
    const { groupSize = 4 } = req.body;
    const participants = tournament.participants.filter(p => p.isActive);
    
    // Algorytm podziału na grupy
    const groups = divideIntoGroups(participants, groupSize);
    
    tournament.groups = groups;
    await tournament.save();
    
    res.json({ success: true, groups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generateBrackets = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('participants');
    
    const storage = new JsonDatabase();
    const manager = new BracketsManager(storage);
    
    // Generowanie drabinek na podstawie typu turnieju
    const seeding = tournament.participants.map(p => p.name);
    
    await manager.create.stage({
      tournamentId: tournament._id,
      name: 'Main Stage',
      type: tournament.tournamentType,
      seeding: seeding,
      settings: {
        grandFinal: tournament.tournamentType === 'double_elimination' ? 'double' : 'simple'
      }
    });
    
    const brackets = await storage.select('match');
    tournament.brackets = brackets;
    await tournament.save();
    
    res.json({ success: true, brackets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Funkcja pomocnicza do podziału na grupy
function divideIntoGroups(participants, groupSize) {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const groups = [];
  
  for (let i = 0; i < shuffled.length; i += groupSize) {
    groups.push({
      name: `Grupa ${String.fromCharCode(65 + Math.floor(i / groupSize))}`,
      participants: shuffled.slice(i, i + groupSize)
    });
  }
  
  return groups;
}

exports.showManagePage = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId || req.params.id;
    const tournament = await Tournament.findById(tournamentId)
      .populate('participants')
      .populate('clubs');

    // Get all participants from all clubs in this tournament
    const allParticipants = [];
    for (const club of tournament.clubs) {
      const participants = await Participant.find({ club: club._id }).populate('beltRank club');
      allParticipants.push(...participants);
    }

    // Get categories for this tournament and populate beltFrom/beltTo
    const categories = await Category.find({ tournament: tournament._id })
      .populate('participants')
      .populate('beltFrom')
      .populate('beltTo');

    // Load available belt ranks for the form selects
    const beltRanks = await getAllBeltRanks();

    res.render('admin/tournament-manage', {
      tournament,
      participants: allParticipants,
      categories,
      beltRanks,
      getGenderText
    });
  } catch (error) {
    console.error('Error in showManagePage:', error);
    req.flash('error', 'Błąd podczas ładowania turnieju');
    res.redirect('/admin/tournaments');
  }
};

exports.showTournamentList = async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .populate('participants')
      .sort({ createdAt: -1 });

    res.render('admin/tournaments', {
      tournaments
    });
  } catch (error) {
    req.flash('error', 'Błąd podczas ładowania turniejów');
    res.redirect('/admin');
  }
};

// Generate brackets for tournament
exports.generateBrackets = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    // Get all categories for this tournament
    const categories = await Category.find({ tournament: tournament._id })
      .populate('participants');
    
    if (categories.length === 0) {
      req.flash('error', 'Brak kategorii w turnieju. Najpierw utwórz kategorie.');
      return res.redirect(`/admin/tournaments/${tournament._id}/manage`);
    }
    
    // Generate brackets for all categories
    for (const category of categories) {
      if (category.participants.length < 2) {
        continue; // Skip categories with insufficient participants
      }
      
      // Clear existing matches for this category
      await Match.deleteMany({ tournament: tournament._id, category: category._id });
      
      let matches = [];
      
      if (category.bracketType === 'single_elimination') {
        matches = generateSingleEliminationBracket(category.participants, tournament._id, category._id);
      } else if (category.bracketType === 'round_robin') {
        matches = generateRoundRobinMatches(category.participants, tournament._id, category._id);
      }
      
      // Save matches to database
      const savedMatches = await Match.insertMany(matches);
      
      // Update category with match references
      category.matches = savedMatches.map(match => match._id);
      await category.save();
    }
    
    await tournament.save();
    
    req.flash('success', 'Drabinki zostały wygenerowane');
    res.redirect(`/admin/tournaments/${tournament._id}/manage`);
  } catch (error) {
    console.error('Error generating brackets:', error);
    req.flash('error', 'Błąd podczas generowania drabinek');
    res.redirect('back');
  }
};


// Prepare tournament - generate all brackets and groups
exports.prepareTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('clubs');
    
    // Get all categories for this tournament
    const categories = await Category.find({ tournament: tournament._id })
      .populate('participants');
    
    if (categories.length === 0) {
      req.flash('error', 'Brak kategorii w turnieju. Najpierw utwórz kategorie.');
      return res.redirect(`/admin/tournaments/${tournament._id}/manage`);
    }
    
    // Generate brackets for all categories
    for (const category of categories) {
      if (category.participants.length < 2) {
        continue; // Skip categories with insufficient participants
      }
      
      // Clear existing matches for this category
      await Match.deleteMany({ tournament: tournament._id, category: category._id });
      
      let matches = [];
      
      if (category.bracketType === 'single_elimination') {
        matches = generateSingleEliminationBracket(category.participants, tournament._id, category._id);
      } else if (category.bracketType === 'round_robin') {
        matches = generateRoundRobinMatches(category.participants, tournament._id, category._id);
      }
      
      // Save matches to database
      const savedMatches = await Match.insertMany(matches);
      
      // Update category with match references
      category.matches = savedMatches.map(match => match._id);
      await category.save();
    }
    
    await tournament.save();
    
    req.flash('success', 'Turniej został przygotowany. Wszystkie drabinki zostały wygenerowane.');
    res.redirect(`/admin/tournaments/${tournament._id}/manage`);
  } catch (error) {
    console.error('Error preparing tournament:', error);
    req.flash('error', 'Błąd podczas przygotowywania turnieju');
    res.redirect('back');
  }
};

// Helper function to generate single elimination bracket
function generateSingleEliminationBracket(participants, tournamentId, categoryId) {
  const matches = [];
  const numParticipants = participants.length;
  const numRounds = Math.ceil(Math.log2(numParticipants));
  
  // Add byes if needed
  const numByes = Math.pow(2, numRounds) - numParticipants;
  const participantsWithByes = [...participants];
  
  for (let i = 0; i < numByes; i++) {
    participantsWithByes.push(null); // null represents a bye
  }

  // Shuffle participants
  participantsWithByes.sort(() => Math.random() - 0.5);

  let currentRound = 1;
  let currentParticipants = participantsWithByes;
  let matchNumber = 1;

  while (currentParticipants.length > 1) {
    const nextRoundParticipants = [];
    
    for (let i = 0; i < currentParticipants.length; i += 2) {
      const participant1 = currentParticipants[i];
      const participant2 = currentParticipants[i + 1];
      
      if (participant1 && participant2) {
        // Regular match
        matches.push({
          tournament: tournamentId,
          category: categoryId,
          round: `Round ${currentRound}`,
          matchNumber: matchNumber++,
          participant1: participant1._id,
          participant2: participant2._id,
          status: 'scheduled'
        });
        nextRoundParticipants.push(participant1); // Winner placeholder
      } else if (participant1 && !participant2) {
        // Bye - participant1 advances
        nextRoundParticipants.push(participant1);
      }
    }
    
    currentParticipants = nextRoundParticipants;
    currentRound++;
  }

  return matches;
}

// Move participant between categories
exports.moveParticipant = async (req, res) => {
  try {
    const { participantId, fromCategoryId, toCategoryId } = req.body;
    
    // Remove participant from source category
    if (fromCategoryId) {
      const fromCategory = await Category.findById(fromCategoryId);
      fromCategory.participants = fromCategory.participants.filter(p => p.toString() !== participantId);
      await fromCategory.save();
    }
    
    // Add participant to target category
    if (toCategoryId) {
      const toCategory = await Category.findById(toCategoryId);
      if (!toCategory.participants.includes(participantId)) {
        toCategory.participants.push(participantId);
        await toCategory.save();
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error moving participant:', error);
    res.status(500).json({ error: 'Error moving participant' });
  }
};


// Helper function to generate round robin matches
function generateRoundRobinMatches(participants, tournamentId, categoryId) {
  const matches = [];
  const numParticipants = participants.length;
  let matchNumber = 1;

  // Round robin: each participant plays every other participant once
  for (let i = 0; i < numParticipants; i++) {
    for (let j = i + 1; j < numParticipants; j++) {
      matches.push({
        tournament: tournamentId,
        category: categoryId,
        round: 'Round Robin',
        matchNumber: matchNumber++,
        participant1: participants[i]._id,
        participant2: participants[j]._id,
        status: 'scheduled'
      });
    }
  }

  return matches;
}