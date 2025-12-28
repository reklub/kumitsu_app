const Tournament = require('../models/Tournament');
const Category = require('../models/Category');
const Match = require('../models/Match');
const Participant = require('../models/Participant');
const { BracketsManager } = require('brackets-manager');
const { JsonDatabase } = require('brackets-json-db');
const { getBeltColors, getAllBeltRanks, getGenderText } = require('../utils/tournamentHelpers');
const { generateSingleEliminationBracket, generateRoundRobinMatches } = require('../utils/bracketGenerator');


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
    
    // Algorytm podziaĹ‚u na grupy
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
    const tournament = await Tournament.findById(req.params.id);
    
    // Get all categories for this tournament
    const categories = await Category.find({ tournament: tournament._id })
      .populate('participants');
    
    if (categories.length === 0) {
      req.flash('error', 'Brak kategorii w turnieju. Najpierw utwĂłrz kategorie.');
      return res.redirect(`/admin/tournaments/${tournament._id}/manage`);
    }
    
    // Sort categories by participant count (descending) - biggest categories first (longest path to medal)
    const sortedCategories = categories.sort((a, b) => b.participants.length - a.participants.length);
    
    // Delete all existing matches for this tournament
    await Match.deleteMany({ tournament: tournament._id });
    
    // Generate bracket structure for each category
    const bracketsByCategory = {};
    for (const category of sortedCategories) {
      if (category.participants.length < 2) {
        continue;
      }
      
      let result = {};
      
      if (category.bracketType === 'single_elimination') {
        result = generateSingleEliminationBracket(
          category.participants, 
          tournament._id, 
          category._id, 
          1  // Will renumber later
        );
      } else if (category.bracketType === 'round_robin') {
        result = generateRoundRobinMatches(
          category.participants, 
          tournament._id, 
          category._id, 
          1  // Will renumber later
        );
      }
      
      bracketsByCategory[category._id] = {
        category: category,
        rounds: result.rounds || [], // For single elimination
        matches: result.matches || [], // For round robin
        bracketType: category.bracketType
      };
    }
    
    // Now renumber matches: phase by phase across all categories
    // Phase 1: All first rounds from all categories, then second rounds, etc.
    let globalMatchNumber = 1;
    
    // Calculate max rounds for single elimination categories
    const roundsPerCategory = Object.values(bracketsByCategory).map(b => b.rounds.length || 0);
    const maxRounds = roundsPerCategory.length > 0 ? Math.max(...roundsPerCategory) : 0;
    
    // If only round-robin (no single elimination), maxRounds should be at least 1
    const hasRoundRobin = Object.values(bracketsByCategory).some(b => b.bracketType === 'round_robin');
    const actualMaxRounds = Math.max(maxRounds, hasRoundRobin ? 1 : 0);
    
    // For each round/phase
    for (let roundNum = 1; roundNum <= actualMaxRounds; roundNum++) {
      // For each category (in sorted order)
      for (const category of sortedCategories) {
        const bracket = bracketsByCategory[category._id];
        
        if (!bracket) continue;
        
        // Get matches for this round
        if (bracket.bracketType === 'single_elimination' && bracket.rounds.length > 0) {
          const roundData = bracket.rounds[roundNum - 1];
          if (roundData) {
            // Renumber matches in this round
            for (const match of roundData.matches) {
              match.matchNumber = globalMatchNumber++;
            }
          }
        } else if (bracket.bracketType === 'round_robin' && roundNum === 1) {
          // Round robin: all matches are in one phase
          for (const match of bracket.matches) {
            match.matchNumber = globalMatchNumber++;
          }
        }
      }
    }
    
    // Collect all matches and save to database
    const allMatches = [];
    const matchIndexMap = {}; // Map to track match indices for category assignment
    
    for (const bracket of Object.values(bracketsByCategory)) {
      let matches = [];
      if (bracket.bracketType === 'single_elimination') {
        matches = bracket.rounds.flatMap(r => r.matches);
      } else {
        matches = bracket.matches;
      }
      
      // Tag matches with their index for later identification
      matches.forEach((m, idx) => {
        const key = `${m.category}_${m.matchNumber}_${m.round}`;
        matchIndexMap[key] = allMatches.length + idx;
      });
      
      allMatches.push(...matches);
    }
    
    const savedMatches = await Match.insertMany(allMatches);
    
    // Update categories with match references - use indices instead of searching
    for (const category of sortedCategories) {
      const bracket = bracketsByCategory[category._id];
      if (bracket) {
        const categoryMatches = bracket.bracketType === 'single_elimination' 
          ? bracket.rounds.flatMap(r => r.matches)
          : bracket.matches;
        
        const matchIds = categoryMatches.map(m => {
          const key = `${m.category}_${m.matchNumber}_${m.round}`;
          const idx = matchIndexMap[key];
          return idx !== undefined ? savedMatches[idx]._id : null;
        }).filter(id => id !== null);
        
        category.matches = matchIds;
        await category.save();
      }
    }
    
    await tournament.save();
    
    req.flash('success', 'Drabinki zostaĹ‚y wygenerowane');
    res.redirect(`/admin/tournaments/${tournament._id}/manage`);
  } catch (error) {
    console.error('Error generating brackets:', error);
    req.flash('error', 'BĹ‚Ä…d podczas generowania drabinek');
    res.redirect('back');
  }
};

// Funkcja pomocnicza do podziaĹ‚u na grupy
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
      .populate('matches')
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
    req.flash('error', 'BĹ‚Ä…d podczas Ĺ‚adowania turnieju');
    res.redirect('/admin/tournaments');
  }
};

exports.showBrackets = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId || req.params.id;
    const tournament = await Tournament.findById(tournamentId);

    // Get all categories with populated matches and participants
    const categories = await Category.find({ tournament: tournament._id })
      .populate({
        path: 'matches',
        populate: [
          { path: 'participant1', populate: { path: 'beltRank' } },
          { path: 'participant2', populate: { path: 'beltRank' } },
          { path: 'winner', populate: { path: 'beltRank' } }
        ]
      });

    // Transform categories data for template
    const transformedCategories = categories.map(category => {
      if (!category.matches || category.matches.length === 0) {
        return {
          ...category.toObject(),
          hasMatches: false,
          matchCount: 0,
          rounds: []
        };
      }

      // Group matches by round
      const matchesByRound = {};
      category.matches.forEach(match => {
        if (!matchesByRound[match.round]) {
          matchesByRound[match.round] = [];
        }
        matchesByRound[match.round].push(match);
      });

      // Sort matches within each round by matchNumber
      Object.keys(matchesByRound).forEach(round => {
        matchesByRound[round].sort((a, b) => a.matchNumber - b.matchNumber);
      });

      // Create round data
      const rounds = Object.keys(matchesByRound)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map((roundNum, idx) => {
          const matches = matchesByRound[roundNum];
          const totalRounds = Object.keys(matchesByRound).length;
          
          // Generate round name
          let roundName = `Runda ${roundNum}`;
          if (category.bracketType === 'single_elimination') {
            if (matches.length === 1) roundName = 'FinaĹ‚';
            else if (matches.length === 2) roundName = 'PĂłĹ‚finaĹ‚y';
            else if (matches.length === 4) roundName = 'Ä†wierÄ‡finaĹ‚y';
            else if (totalRounds > 1 && idx === 0) roundName = '1/8 FinaĹ‚u';
          }
          
          return {
            roundNumber: roundNum,
            name: roundName,
            matches: matches.map(m => ({
              ...m.toObject(),
              matchNumber: m.matchNumber,
              _id: m._id
            }))
          };
        });

      return {
        ...category.toObject(),
        hasMatches: true,
        matchCount: category.matches.length,
        rounds: rounds
      };
    });

    res.render('matches/brackets', {
      tournament,
      categories: transformedCategories
    });
  } catch (error) {
    console.error('Error showing brackets:', error);
    req.flash('error', 'BĹ‚Ä…d podczas Ĺ‚adowania drabinek');
    res.redirect('back');
  }
};

exports.showTournamentList = async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .sort({ createdAt: -1 });

    res.render('admin/tournaments', {
      tournaments
    });
  } catch (error) {
    req.flash('error', 'BĹ‚Ä…d podczas Ĺ‚adowania turniejĂłw');
    res.redirect('/admin');
  }
};

// Generate brackets for tournament
// Prepare tournament - generate all brackets and groups
exports.prepareTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('clubs');
    
    // Get all categories for this tournament
    const categories = await Category.find({ tournament: tournament._id })
      .populate('participants');
    
    if (categories.length === 0) {
      req.flash('error', 'Brak kategorii w turnieju. Najpierw utwĂłrz kategorie.');
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
    
    req.flash('success', 'Turniej zostaĹ‚ przygotowany. Wszystkie drabinki zostaĹ‚y wygenerowane.');
    res.redirect(`/admin/tournaments/${tournament._id}/manage`);
  } catch (error) {
    console.error('Error preparing tournament:', error);
    req.flash('error', 'BĹ‚Ä…d podczas przygotowywania turnieju');
    res.redirect('back');
  }
};

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



