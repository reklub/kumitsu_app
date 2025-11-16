const Tournament = require('../models/Tournament');
const Category = require('../models/Category');
const Participant = require('../models/Participant');
const Match = require('../models/Match');
const BeltRank = require('../models/BeltRank');

// Helper function to auto-assign a single participant to categories
async function assignParticipantToCategory(participant, tournament) {
  try {
    const age = new Date().getFullYear() - participant.dateOfBirth.getFullYear();
    
    console.log(`\n=== Auto-assigning participant: ${participant.firstName} ${participant.lastName} ===`);
    console.log(`Age: ${age}, Gender: ${participant.gender}, Weight: ${participant.weight}, Belt Rank Order: ${participant.beltRank.order}`);
    
    // Get all categories for this tournament with populated belt ranks
    const categories = await Category.find({ tournament: tournament._id })
      .populate('beltFrom')
      .populate('beltTo');

    console.log(`Found ${categories.length} categories for tournament`);

    // Try to find a matching category
    for (const category of categories) {
      console.log(`\nChecking category: ${category.name}`);
      console.log(`  Gender: ${category.gender}, Age: ${category.ageMin}-${category.ageMax}, Weight: ${category.weightMin}-${category.weightMax}`);
      if (category.beltFrom) console.log(`  Belt from order: ${category.beltFrom.order}`);
      if (category.beltTo) console.log(`  Belt to order: ${category.beltTo.order}`);
      
      if (matchesCategory(participant, age, category)) {
        console.log(`✓ MATCH! Adding to category: ${category.name}`);
        // Add participant to category if not already there
        if (!category.participants.includes(participant._id)) {
          category.participants.push(participant._id);
          await category.save();
        }
        return category;
      } else {
        console.log(`✗ No match for ${category.name}`);
      }
    }
    
    console.log(`\n✗ Participant ${participant.firstName} ${participant.lastName} did not match any category\n`);
    return null;
  } catch (error) {
    console.error('Error assigning participant to category:', error);
    return null;
  }
}

// Create a new category for a tournament
exports.createCategory = async (req, res) => {
  try {
    const { name, ageMin, ageMax, weightMin, weightMax, gender, beltFrom, beltTo, bracketType } = req.body;
    const tournamentId = req.params.tournamentId;

    const category = new Category({
      name,
      ageMin: ageMin ? parseInt(ageMin) : null,
      ageMax: ageMax ? parseInt(ageMax) : null,
      weightMin: weightMin ? parseFloat(weightMin) : null,
      weightMax: weightMax ? parseFloat(weightMax) : null,
      gender,
      beltFrom: beltFrom || undefined,
      beltTo: beltTo || undefined,
      tournament: tournamentId,
      bracketType: bracketType || 'single_elimination'
    });

    await category.save();
    req.flash('success', 'Kategoria została utworzona');
    res.redirect(`/admin/tournaments/${tournamentId}/manage`);
  } catch (error) {
    console.error('Error creating category:', error);
    req.flash('error', 'Błąd podczas tworzenia kategorii');
    res.redirect('back');
  }
};

// Auto-assign participants to categories based on their attributes
exports.autoAssignParticipants = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    const tournament = await Tournament.findById(tournamentId).populate('clubs');
    
    // Get all participants from all clubs in this tournament
    const allParticipants = [];
    for (const club of tournament.clubs) {
      const participants = await Participant.find({ club: club._id }).populate('beltRank');
      allParticipants.push(...participants);
    }

    // Get all categories for this tournament with populated belt ranks
    const categories = await Category.find({ tournament: tournamentId })
      .populate('beltFrom')
      .populate('beltTo');

    // Clear existing assignments
    for (const category of categories) {
      category.participants = [];
      await category.save();
    }

    // Assign participants to categories
    for (const participant of allParticipants) {
      const age = new Date().getFullYear() - participant.dateOfBirth.getFullYear();
      
      for (const category of categories) {
        if (matchesCategory(participant, age, category)) {
          category.participants.push(participant._id);
          await category.save();
          break; // Assign to first matching category
        }
      }
    }

    req.flash('success', 'Uczestnicy zostali automatycznie przypisani do kategorii');
    res.redirect(`/admin/tournaments/${tournamentId}/manage`);
  } catch (error) {
    console.error('Error auto-assigning participants:', error);
    req.flash('error', 'Błąd podczas automatycznego przypisywania uczestników');
    res.redirect('back');
  }
};

// Helper function to check if participant matches category criteria
function matchesCategory(participant, age, category) {
  // Check gender
  if (category.gender && category.gender !== 'mixed' && participant.gender !== category.gender) {
    console.log(`    ✗ Gender mismatch: ${participant.gender} != ${category.gender}`);
    return false;
  }

  // Check age
  if (category.ageMin && age < category.ageMin) {
    console.log(`    ✗ Age too low: ${age} < ${category.ageMin}`);
    return false;
  }
  if (category.ageMax && age > category.ageMax) {
    console.log(`    ✗ Age too high: ${age} > ${category.ageMax}`);
    return false;
  }

  // Check weight
  if (category.weightMin && participant.weight < category.weightMin) {
    console.log(`    ✗ Weight too low: ${participant.weight} < ${category.weightMin}`);
    return false;
  }
  if (category.weightMax && participant.weight > category.weightMax) {
    console.log(`    ✗ Weight too high: ${participant.weight} > ${category.weightMax}`);
    return false;
  }

  // Check belt rank using beltFrom and beltTo (uses order field for ranking)
  if (category.beltFrom || category.beltTo) {
    const participantBeltOrder = participant.beltRank.order || 0;
    
    // If beltFrom is set, participant must be at or above that rank (higher or equal order)
    if (category.beltFrom && participantBeltOrder < category.beltFrom.order) {
      console.log(`    ✗ Belt rank too low: ${participantBeltOrder} < ${category.beltFrom.order}`);
      return false;
    }
    
    // If beltTo is set, participant must be at or below that rank (lower or equal order)
    if (category.beltTo && participantBeltOrder > category.beltTo.order) {
      console.log(`    ✗ Belt rank too high: ${participantBeltOrder} > ${category.beltTo.order}`);
      return false;
    }
  }

  return true;
}

// Generate groups for a category
exports.generateGroups = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { groupSize = 4 } = req.body;

    const category = await Category.findById(categoryId).populate('participants');
    
    if (category.participants.length === 0) {
      req.flash('error', 'Brak uczestników w tej kategorii');
      return res.redirect('back');
    }

    // Clear existing groups
    category.groups = [];

    // Shuffle participants
    const shuffledParticipants = [...category.participants].sort(() => Math.random() - 0.5);

    // Divide into groups
    const groups = [];
    for (let i = 0; i < shuffledParticipants.length; i += groupSize) {
      const groupParticipants = shuffledParticipants.slice(i, i + groupSize);
      groups.push({
        name: `Grupa ${Math.floor(i / groupSize) + 1}`,
        participants: groupParticipants.map(p => p._id),
        matches: []
      });
    }

    category.groups = groups;
    await category.save();

    req.flash('success', `Wygenerowano ${groups.length} grup dla kategorii ${category.name}`);
    res.redirect(`/admin/tournaments/${category.tournament}/manage`);
  } catch (error) {
    console.error('Error generating groups:', error);
    req.flash('error', 'Błąd podczas generowania grup');
    res.redirect('back');
  }
};

// Generate brackets for a category
exports.generateBrackets = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId).populate('participants');

    if (category.participants.length < 2) {
      req.flash('error', 'Potrzeba co najmniej 2 uczestników do wygenerowania drabinki');
      return res.redirect('back');
    }

    // Clear existing matches for this category
    await Match.deleteMany({ tournament: category.tournament, category: categoryId });

    let matches = [];

    if (category.bracketType === 'single_elimination') {
      matches = generateSingleEliminationBracket(category.participants, category.tournament, categoryId);
    } else if (category.bracketType === 'round_robin') {
      matches = generateRoundRobinMatches(category.participants, category.tournament, categoryId);
    }

    // Save matches to database
    const savedMatches = await Match.insertMany(matches);

    // Update category with match references
    category.matches = savedMatches.map(match => match._id);
    await category.save();

    req.flash('success', `Wygenerowano drabinkę dla kategorii ${category.name}`);
    res.redirect(`/admin/tournaments/${category.tournament}/manage`);
  } catch (error) {
    console.error('Error generating brackets:', error);
    req.flash('error', 'Błąd podczas generowania drabinki');
    res.redirect('back');
  }
};

// Generate single elimination bracket
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

// Generate round robin matches
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

// Start tournament - begin the first matches
exports.startTournament = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    
    // Check if tournament exists
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      req.flash('error', 'Turniej nie został znaleziony');
      return res.redirect('back');
    }

    
    // Get all categories
    const categories = await Category.find({ tournament: tournamentId });
    
    if (categories.length === 0) {
      req.flash('error', 'Brak kategorii w turnieju');
      return res.redirect(`/admin/tournaments/${tournamentId}/manage`);
    }
    
    // Schedule first round matches
    let totalScheduled = 0;
    for (const category of categories) {
      // Find first round matches - handle different round formats
      const firstRoundMatches = await Match.find({
        tournament: tournamentId,
        category: category._id,
        status: 'scheduled',
        $or: [
          { round: 'Round 1' },
          { round: '1' },
          { round: 1 },
          { round: 'Round Robin' }
        ]
      }).populate('participant1 participant2');

      if (firstRoundMatches.length > 0) {
        // Schedule matches with time intervals
        const startTime = new Date();
        for (let i = 0; i < firstRoundMatches.length; i++) {
          firstRoundMatches[i].scheduledTime = new Date(startTime.getTime() + (i * 30 * 60 * 1000)); // 30 minutes apart
          firstRoundMatches[i].court = `Court ${(i % 4) + 1}`; // Assign to courts 1-4
          await firstRoundMatches[i].save();
          totalScheduled++;
        }
      }
    }

    if (totalScheduled === 0) {
      req.flash('warning', 'Turniej został rozpoczęty, ale nie znaleziono meczów do zaplanowania. Upewnij się, że drabinki zostały wygenerowane.');
    } else {
      req.flash('success', `Turniej został rozpoczęty! Zaplanowano ${totalScheduled} meczów.`);
    }
    
    res.redirect(`/admin/tournaments/${tournamentId}/live`);
  } catch (error) {
    console.error('Error starting tournament:', error);
    req.flash('error', `Błąd podczas rozpoczynania turnieju: ${error.message}`);
    res.redirect('back');
  }
};

// Get live tournament data
exports.getLiveTournament = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    
    const tournament = await Tournament.findById(tournamentId);
    const categories = await Category.find({ tournament: tournamentId })
      .populate('participants')
      .populate({
        path: 'matches',
        populate: {
          path: 'participant1 participant2 winner',
          populate: {
            path: 'beltRank club'
          }
        }
      });

    res.render('admin/tournament-live', {
      tournament,
      categories
    });
  } catch (error) {
    console.error('Error getting live tournament:', error);
    req.flash('error', 'Błąd podczas ładowania turnieju');
    res.redirect('back');
  }
};

// Update match result
exports.updateMatchResult = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { score1, score2, winnerId } = req.body;

    const match = await Match.findById(matchId).populate('participant1 participant2');
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    match.score1 = parseInt(score1);
    match.score2 = parseInt(score2);
    match.winner = winnerId;
    match.status = 'completed';
    match.actualEndTime = new Date();

    await match.save();

    // If this is a single elimination tournament, advance the winner
    if (match.round.includes('Round')) {
      await advanceWinner(match);
    }

    res.json({ success: true, match });
  } catch (error) {
    console.error('Error updating match result:', error);
    res.status(500).json({ error: 'Error updating match result' });
  }
};

// Advance winner to next round
async function advanceWinner(match) {
  const currentRound = parseInt(match.round.split(' ')[1]);
  const nextRound = currentRound + 1;
  
  // Find the next match for this winner
  const nextMatch = await Match.findOne({
    tournament: match.tournament,
    category: match.category,
    round: `Round ${nextRound}`,
    $or: [
      { participant1: null },
      { participant2: null }
    ]
  });

  if (nextMatch) {
    if (!nextMatch.participant1) {
      nextMatch.participant1 = match.winner;
    } else if (!nextMatch.participant2) {
      nextMatch.participant2 = match.winner;
    }
    await nextMatch.save();
  }
}

// Get tournament brackets view
exports.getBrackets = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    
    const tournament = await Tournament.findById(tournamentId);
    const categories = await Category.find({ tournament: tournamentId })
      .populate({
        path: 'matches',
        populate: {
          path: 'participant1 participant2 winner',
          populate: {
            path: 'beltRank club'
          }
        }
      });

    res.render('matches/brackets', {
      tournament,
      categories
    });
  } catch (error) {
    console.error('Error getting brackets:', error);
    req.flash('error', 'Błąd podczas ładowania drabinek');
    res.redirect('back');
  }
};

// Get current matches for live view
exports.getCurrentMatches = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    
    const currentMatches = await Match.find({
      tournament: tournamentId,
      status: { $in: ['scheduled', 'in_progress'] }
    })
    .populate('participant1 participant2')
    .populate({
      path: 'participant1 participant2',
      populate: {
        path: 'beltRank club'
      }
    })
    .sort({ scheduledTime: 1 });

    res.json({ matches: currentMatches });
  } catch (error) {
    console.error('Error getting current matches:', error);
    res.status(500).json({ error: 'Error getting current matches' });
  }
};

// Start a specific match
exports.startMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    match.status = 'in_progress';
    match.actualStartTime = new Date();
    await match.save();
    
    res.json({ success: true, match });
  } catch (error) {
    console.error('Error starting match:', error);
    res.status(500).json({ error: 'Error starting match' });
  }
};

// Cancel a match
exports.cancelMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { reason } = req.body;
    
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    match.status = 'cancelled';
    match.actualEndTime = new Date();
    await match.save();
    
    res.json({ success: true, match });
  } catch (error) {
    console.error('Error cancelling match:', error);
    res.status(500).json({ error: 'Error cancelling match' });
  }
};

// Get tournament statistics
exports.getTournamentStats = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    
    const totalMatches = await Match.countDocuments({ tournament: tournamentId });
    const completedMatches = await Match.countDocuments({ 
      tournament: tournamentId, 
      status: 'completed' 
    });
    const inProgressMatches = await Match.countDocuments({ 
      tournament: tournamentId, 
      status: 'in_progress' 
    });
    const scheduledMatches = await Match.countDocuments({ 
      tournament: tournamentId, 
      status: 'scheduled' 
    });
    
    const categories = await Category.find({ tournament: tournamentId })
      .populate('participants');
    
    const totalParticipants = categories.reduce((sum, cat) => sum + cat.participants.length, 0);
    
    res.json({
      totalMatches,
      completedMatches,
      inProgressMatches,
      scheduledMatches,
      totalParticipants,
      categoriesCount: categories.length
    });
  } catch (error) {
    console.error('Error getting tournament stats:', error);
    res.status(500).json({ error: 'Error getting tournament statistics' });
  }
};

// Get categories for a tournament
exports.getCategories = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    const categories = await Category.find({ tournament: tournamentId });
    
    if (!tournament) {
      return res.status(404).send('Tournament not found');
    }
    
    res.render('categories/index', { tournament, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).send('Server error');
  }
};

// Show create category form
exports.showCreateCategoryForm = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      return res.status(404).send('Tournament not found');
    }
    
    res.render('categories/new', { tournament });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
};

// Export helper function for use in other controllers
exports.assignParticipantToCategory = assignParticipantToCategory;