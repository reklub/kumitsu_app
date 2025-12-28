const Tournament = require('../models/Tournament');
const Category = require('../models/Category');
const Participant = require('../models/Participant');
const Match = require('../models/Match');
const BeltRank = require('../models/BeltRank');
const { generateSingleEliminationBracket, generateRoundRobinMatches } = require('../utils/bracketGenerator');

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
        console.log(`âś“ MATCH! Adding to category: ${category.name}`);
        // Add participant to category if not already there
        if (!category.participants.includes(participant._id)) {
          category.participants.push(participant._id);
          await category.save();
        }
        return category;
      } else {
        console.log(`âś— No match for ${category.name}`);
      }
    }
    
    console.log(`\nâś— Participant ${participant.firstName} ${participant.lastName} did not match any category\n`);
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
    req.flash('success', 'Kategoria zostaĹ‚a utworzona');
    res.redirect(`/admin/tournaments/${tournamentId}/manage`);
  } catch (error) {
    console.error('Error creating category:', error);
    req.flash('error', 'BĹ‚Ä…d podczas tworzenia kategorii');
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
    req.flash('error', 'BĹ‚Ä…d podczas automatycznego przypisywania uczestnikĂłw');
    res.redirect('back');
  }
};

// Helper function to check if participant matches category criteria
function matchesCategory(participant, age, category) {
  // Check gender
  if (category.gender && category.gender !== 'mixed' && participant.gender !== category.gender) {
    console.log(`    âś— Gender mismatch: ${participant.gender} != ${category.gender}`);
    return false;
  }

  // Check age
  if (category.ageMin && age < category.ageMin) {
    console.log(`    âś— Age too low: ${age} < ${category.ageMin}`);
    return false;
  }
  if (category.ageMax && age > category.ageMax) {
    console.log(`    âś— Age too high: ${age} > ${category.ageMax}`);
    return false;
  }

  // Check weight
  if (category.weightMin && participant.weight < category.weightMin) {
    console.log(`    âś— Weight too low: ${participant.weight} < ${category.weightMin}`);
    return false;
  }
  if (category.weightMax && participant.weight > category.weightMax) {
    console.log(`    âś— Weight too high: ${participant.weight} > ${category.weightMax}`);
    return false;
  }

  // Check belt rank using beltFrom and beltTo (uses order field for ranking)
  if (category.beltFrom || category.beltTo) {
    const participantBeltOrder = participant.beltRank.order || 0;
    
    // If beltFrom is set, participant must be at or above that rank (higher or equal order)
    if (category.beltFrom && participantBeltOrder < category.beltFrom.order) {
      console.log(`    âś— Belt rank too low: ${participantBeltOrder} < ${category.beltFrom.order}`);
      return false;
    }
    
    // If beltTo is set, participant must be at or below that rank (lower or equal order)
    if (category.beltTo && participantBeltOrder > category.beltTo.order) {
      console.log(`    âś— Belt rank too high: ${participantBeltOrder} > ${category.beltTo.order}`);
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
      req.flash('error', 'Brak uczestnikĂłw w tej kategorii');
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
    req.flash('error', 'BĹ‚Ä…d podczas generowania grup');
    res.redirect('back');
  }
};

// Generate brackets for a category
exports.generateBrackets = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId).populate('participants');
    const tournament = await Tournament.findById(category.tournament);

    if (category.participants.length < 2) {
      req.flash('error', 'Potrzeba co najmniej 2 uczestnikĂłw do wygenerowania drabinki');
      return res.redirect('back');
    }

    // Get all categories for this tournament and sort by participant count (descending)
    const allCategories = await Category.find({ tournament: category.tournament })
      .populate('participants');
    const sortedCategories = allCategories.sort((a, b) => b.participants.length - a.participants.length);

    // Delete all existing matches for entire tournament
    await Match.deleteMany({ tournament: category.tournament });

    // Generate bracket structure for each category
    const bracketsByCategory = {};
    for (const cat of sortedCategories) {
      if (cat.participants.length < 2) {
        continue;
      }

      let result = {};

      if (cat.bracketType === 'single_elimination') {
        result = generateSingleEliminationBracket(
          cat.participants, 
          category.tournament, 
          cat._id,
          1  // Will renumber later
        );
      } else if (cat.bracketType === 'round_robin') {
        result = generateRoundRobinMatches(
          cat.participants, 
          category.tournament, 
          cat._id,
          1  // Will renumber later
        );
      }

      bracketsByCategory[cat._id] = {
        category: cat,
        rounds: result.rounds || [],
        matches: result.matches || [],
        bracketType: cat.bracketType
      };
    }

    // Now renumber matches: phase by phase across all categories
    let globalMatchNumber = 1;
    const maxRounds = Math.max(...Object.values(bracketsByCategory).map(b => b.rounds.length || 1));

    // For each round/phase
    for (let roundNum = 1; roundNum <= maxRounds; roundNum++) {
      // For each category (in sorted order)
      for (const cat of sortedCategories) {
        const bracket = bracketsByCategory[cat._id];

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
    for (const cat of sortedCategories) {
      const bracket = bracketsByCategory[cat._id];
      if (bracket) {
        const categoryMatches = bracket.bracketType === 'single_elimination' 
          ? bracket.rounds.flatMap(r => r.matches)
          : bracket.matches;

        const matchIds = categoryMatches.map(m => {
          const key = `${m.category}_${m.matchNumber}_${m.round}`;
          const idx = matchIndexMap[key];
          return idx !== undefined ? savedMatches[idx]._id : null;
        }).filter(id => id !== null);

        cat.matches = matchIds;
        await cat.save();
      }
    }

    req.flash('success', `Drabinki zostaĹ‚y wygenerowane ponownie dla caĹ‚ego turnieju`);
    res.redirect(`/admin/tournaments/${category.tournament}/manage`);
  } catch (error) {
    console.error('Error generating brackets:', error);
    req.flash('error', 'BĹ‚Ä…d podczas generowania drabinki');
    res.redirect('back');
  }
};

// Start tournament - begin the first matches
exports.startTournament = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    
    // Check if tournament exists
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      req.flash('error', 'Turniej nie zostaĹ‚ znaleziony');
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
      req.flash('warning', 'Turniej zostaĹ‚ rozpoczÄ™ty, ale nie znaleziono meczĂłw do zaplanowania. Upewnij siÄ™, ĹĽe drabinki zostaĹ‚y wygenerowane.');
    } else {
      req.flash('success', `Turniej zostaĹ‚ rozpoczÄ™ty! Zaplanowano ${totalScheduled} meczĂłw.`);
    }
    
    res.redirect(`/admin/tournaments/${tournamentId}/live`);
  } catch (error) {
    console.error('Error starting tournament:', error);
    req.flash('error', `BĹ‚Ä…d podczas rozpoczynania turnieju: ${error.message}`);
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

    // Process bracket data for rendering (same as in getBrackets)
    const processedCategories = categories.map(category => {
      const matches = category.matches || [];
      
      // Group matches by round
      const roundsMap = {};
      matches.forEach(match => {
        if (!roundsMap[match.round]) {
          roundsMap[match.round] = [];
        }
        roundsMap[match.round].push(match);
      });
      
      // Get round numbers sorted
      const roundNumbers = Object.keys(roundsMap)
        .map(k => parseInt(k))
        .sort((a, b) => a - b);
      
      const totalRounds = roundNumbers.length > 0 ? Math.max(...roundNumbers) : 1;
      
      // Helper to get Polish round name
      const getRoundName = (roundNum) => {
        if (roundNum === totalRounds) return 'FinaĹ‚';
        if (roundNum === totalRounds - 1) return 'PĂłĹ‚finaĹ‚y';
        if (roundNum === totalRounds - 2) return 'Ä†wierÄ‡finaĹ‚y';
        return 'Runda ' + roundNum;
      };
      
      // Build rounds array with round names
      const rounds = roundNumbers.map(roundNum => ({
        number: roundNum,
        name: getRoundName(roundNum),
        matches: roundsMap[roundNum].sort((a, b) => a.matchNumber - b.matchNumber)
      }));
      
      return {
        ...category.toObject(),
        rounds,
        matchCount: matches.length,
        hasMatches: matches.length > 0
      };
    });

    res.render('admin/tournament-live', {
      tournament,
      categories: processedCategories
    });
  } catch (error) {
    console.error('Error getting live tournament:', error);
    req.flash('error', 'BĹ‚Ä…d podczas Ĺ‚adowania turnieju');
    res.redirect('back');
  }
};

// Update match result
exports.updateMatchResult = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { score1, score2, winnerId } = req.body;

    console.log(`[updateMatchResult] Updating match ${matchId} with winner ${winnerId}`);

    const match = await Match.findById(matchId).populate('participant1 participant2 winner');
    
    if (!match) {
      console.log(`[updateMatchResult] Match not found: ${matchId}`);
      return res.status(404).json({ error: 'Match not found' });
    }

    console.log(`[updateMatchResult] Match found: round ${match.round}, category: ${match.category}`);

    match.score1 = parseInt(score1);
    match.score2 = parseInt(score2);
    match.winner = winnerId;
    match.status = 'completed';
    match.actualEndTime = new Date();

    await match.save();
    console.log(`[updateMatchResult] Match saved with status: ${match.status}`);

    // Always try to advance the winner (for single elimination brackets)
    console.log(`[updateMatchResult] Calling advanceWinner...`);
    await advanceWinner(match);

    res.json({ success: true, match });
  } catch (error) {
    console.error('[updateMatchResult] Error:', error);
    res.status(500).json({ error: 'Error updating match result' });
  }
};

// Advance winner to next round
async function advanceWinner(match) {
  try {
    console.log(`[advanceWinner] Starting for match ${match._id}, round: ${match.round}, winner: ${match.winner}`);
    
    if (!match.winner) {
      console.log('[advanceWinner] No winner set, returning');
      return;
    }

    // Find which category this match belongs to
    const category = await Category.findOne({ matches: match._id });
    if (!category) {
      console.log('[advanceWinner] Could not find category for this match');
      return;
    }
    console.log(`[advanceWinner] Found category: ${category._id}`);

    // Parse current round - handle both numeric and string formats
    let currentRound = parseInt(match.round);
    if (isNaN(currentRound)) {
      // If it's a string like "Round 1", extract the number
      const roundMatch = match.round.match(/\d+/);
      currentRound = roundMatch ? parseInt(roundMatch[0]) : 1;
    }
    
    console.log(`[advanceWinner] Current round: ${currentRound}`);
    
    const nextRound = currentRound + 1;
    
    // Get all matches in current round to determine bracket position
    // Query within the category's matches
    const currentRoundMatches = await Match.find({
      _id: { $in: category.matches },
      round: { $in: [currentRound.toString(), currentRound] }
    }).sort({ matchNumber: 1 });

    console.log(`[advanceWinner] Found ${currentRoundMatches.length} matches in current round`);

    if (!currentRoundMatches.length) {
      console.log('[advanceWinner] No matches in current round, returning');
      return;
    }

    // Find this match's position in the current round
    const matchPosition = currentRoundMatches.findIndex(m => m._id.toString() === match._id.toString());
    console.log(`[advanceWinner] Match position: ${matchPosition} out of ${currentRoundMatches.length}`);
    
    // Calculate winner's position in next round
    // Winners from matches 0-1 go to position 0, 2-3 to position 1, etc.
    const nextRoundMatchPosition = Math.floor(matchPosition / 2);

    // Get all matches in next round sorted by match number
    const nextRoundMatches = await Match.find({
      _id: { $in: category.matches },
      round: { $in: [nextRound.toString(), nextRound] }
    }).sort({ matchNumber: 1 });

    console.log(`[advanceWinner] Found ${nextRoundMatches.length} matches in next round`);

    if (nextRoundMatches.length <= nextRoundMatchPosition) {
      console.log(`[advanceWinner] Target match position ${nextRoundMatchPosition} doesn't exist in next round`);
      return; // No next match exists
    }

    const targetMatch = nextRoundMatches[nextRoundMatchPosition];
    console.log(`[advanceWinner] Target match: ${targetMatch._id}, position: ${nextRoundMatchPosition}`);
    
    // Determine which participant slot to fill based on current match position parity
    // Even positions (0, 2, 4...) → participant1, Odd positions (1, 3, 5...) → participant2
    const isEvenPosition = matchPosition % 2 === 0;
    const slotName = isEvenPosition ? 'participant1' : 'participant2';

    console.log(`[advanceWinner] Will place winner in ${slotName} (position ${matchPosition} is ${isEvenPosition ? 'even' : 'odd'})`);

    if (isEvenPosition) {
      if (!targetMatch.participant1) {
        targetMatch.participant1 = match.winner;
        await targetMatch.save();
        console.log(`[advanceWinner] ✓ Winner advanced to next round match as participant1`);
      } else {
        console.log(`[advanceWinner] Participant1 already filled, skipping`);
      }
    } else {
      if (!targetMatch.participant2) {
        targetMatch.participant2 = match.winner;
        await targetMatch.save();
        console.log(`[advanceWinner] ✓ Winner advanced to next round match as participant2`);
      } else {
        console.log(`[advanceWinner] Participant2 already filled, skipping`);
      }
    }
  } catch (error) {
    console.error('[advanceWinner] Error:', error);
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

    // Process bracket data for rendering
    const processedCategories = categories.map(category => {
      const matches = category.matches || [];
      
      // Group matches by round
      const roundsMap = {};
      matches.forEach(match => {
        if (!roundsMap[match.round]) {
          roundsMap[match.round] = [];
        }
        roundsMap[match.round].push(match);
      });
      
      // Get round numbers sorted
      const roundNumbers = Object.keys(roundsMap)
        .map(k => parseInt(k))
        .sort((a, b) => a - b);
      
      const totalRounds = roundNumbers.length > 0 ? Math.max(...roundNumbers) : 1;
      
      // Helper to get Polish round name
      const getRoundName = (roundNum) => {
        if (roundNum === totalRounds) return 'FinaĹ‚';
        if (roundNum === totalRounds - 1) return 'PĂłĹ‚finaĹ‚y';
        if (roundNum === totalRounds - 2) return 'Ä†wierÄ‡finaĹ‚y';
        return 'Runda ' + roundNum;
      };
      
      // Build rounds array with round names
      const rounds = roundNumbers.map(roundNum => ({
        number: roundNum,
        name: getRoundName(roundNum),
        matches: roundsMap[roundNum].sort((a, b) => a.matchNumber - b.matchNumber)
      }));
      
      // For round-robin: calculate standings
      let standings = [];
      if (category.bracketType === 'round_robin') {
        const standingsMap = {};
        category.participants.forEach(participant => {
          standingsMap[participant._id] = {
            participant: participant,
            matches: 0,
            wins: 0,
            points: 0
          };
        });
        
        matches.forEach(match => {
          if (match.status === 'completed' && match.participant1 && match.participant2) {
            standingsMap[match.participant1._id].matches++;
            standingsMap[match.participant2._id].matches++;
            
            if (match.winner) {
              standingsMap[match.winner._id].wins++;
              standingsMap[match.winner._id].points += 3;
            }
          }
        });
        
        standings = Object.values(standingsMap).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return b.wins - a.wins;
        });
      }
      
      return {
        ...category.toObject(),
        rounds,
        standings,
        matchCount: matches.length,
        hasMatches: matches.length > 0
      };
    });

    res.render('matches/brackets', {
      tournament,
      categories: processedCategories
    });
  } catch (error) {
    console.error('Error getting brackets:', error);
    req.flash('error', 'BĹ‚Ä…d podczas Ĺ‚adowania drabinek');
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

    // Check if all previous matches in the same round are completed
    const previousMatches = await Match.find({
      category: match.category,
      round: match.round,
      matchNumber: { $lt: match.matchNumber }
    });

    const allPreviousCompleted = previousMatches.every(m => m.status === 'completed');
    if (!allPreviousCompleted) {
      return res.status(400).json({ 
        error: `Musisz najpierw ukończyć mecze: ${previousMatches
          .filter(m => m.status !== 'completed')
          .map(m => '#' + m.matchNumber)
          .join(', ')}` 
      });
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




