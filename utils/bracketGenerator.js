/**
 * Bracket Generation Utilities
 * Single source of truth for all bracket generation logic
 */

/**
 * Generate Single Elimination Bracket
 * Two-phase system: elimination round (if needed) + main bracket
 * 
 * Strategy:
 * - Calculate firstPhaseSize = 2^floor(log2(numParticipants))
 * - Participants needed for elimination = numParticipants - firstPhaseSize
 * - Elimination matches pair up excess participants
 * - Winners from elimination + bye participants fill the main bracket
 */
function generateSingleEliminationBracket(participants, tournamentId, categoryId, startingMatchNumber = 1) {
  const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
  const numParticipants = shuffledParticipants.length;
  
  if (numParticipants < 2) {
    return { matches: [], nextMatchNumber: startingMatchNumber, rounds: [] };
  }
  
  // Calculate structure: we want to reach 2^n participants for the first phase
  const firstPhaseSize = Math.pow(2, Math.floor(Math.log2(numParticipants)));
  const toEliminate = numParticipants - firstPhaseSize;
  
  const allRounds = [];
  let matchNumber = startingMatchNumber;
  let currentRound = 1;
  
  // PHASE 1: Elimination matches (if needed)
  const preliminaryMatches = [];
  for (let i = 0; i < toEliminate; i++) {
    const match = {
      tournament: tournamentId,
      category: categoryId,
      round: currentRound,
      matchNumber: matchNumber++,
      participant1: shuffledParticipants[i * 2]._id,
      participant2: shuffledParticipants[i * 2 + 1]._id,
      status: 'scheduled',
      winner: null
    };
    preliminaryMatches.push(match);
  }
  
  if (preliminaryMatches.length > 0) {
    allRounds.push({
      roundNumber: currentRound,
      matches: preliminaryMatches,
      isPreliminary: true
    });
    currentRound++;
  }
  
  // PHASE 2: Main bracket
  const byeParticipants = shuffledParticipants.slice(toEliminate * 2);
  
  let slots = [];
  let byeIdx = 0;
  
  // Create full pairs from bye participants
  const fullPairs = Math.floor(byeParticipants.length / 2);
  for (let i = 0; i < fullPairs; i++) {
    slots.push(byeParticipants[byeIdx++]);
    slots.push(byeParticipants[byeIdx++]);
  }
  
  // If odd bye participant, pair with elimination winner placeholder
  if (byeParticipants.length % 2 === 1) {
    slots.push(byeParticipants[byeIdx++]);
    slots.push(null);
  }
  
  // Fill remaining slots with elimination winner placeholders
  while (slots.length < firstPhaseSize) {
    slots.push(null);
    slots.push(null);
  }
  
  // Generate main bracket rounds
  let currentSlots = [...slots];
  
  while (currentSlots.length > 1) {
    const roundMatches = [];
    const nextRoundSlots = [];
    
    for (let i = 0; i < currentSlots.length; i += 2) {
      const p1 = currentSlots[i];
      const p2 = currentSlots[i + 1];
      
      const match = {
        tournament: tournamentId,
        category: categoryId,
        round: currentRound,
        matchNumber: matchNumber++,
        participant1: p1 ? p1._id : null,
        participant2: p2 ? p2._id : null,
        status: 'scheduled',
        winner: null
      };
      
      roundMatches.push(match);
      nextRoundSlots.push(null);
    }
    
    allRounds.push({
      roundNumber: currentRound,
      matches: roundMatches,
      isPreliminary: false
    });
    
    currentSlots = nextRoundSlots;
    currentRound++;
  }
  
  const allMatches = allRounds.flatMap(r => r.matches);
  
  return { 
    matches: allMatches, 
    nextMatchNumber: matchNumber,
    rounds: allRounds
  };
}

/**
 * Generate Round Robin Matches
 */
function generateRoundRobinMatches(participants, tournamentId, categoryId, startingMatchNumber = 1) {
  const matches = [];
  const numParticipants = participants.length;
  let matchNumber = startingMatchNumber;
  
  // Generate all possible pairings
  for (let i = 0; i < numParticipants; i++) {
    for (let j = i + 1; j < numParticipants; j++) {
      const match = {
        tournament: tournamentId,
        category: categoryId,
        round: 1,
        matchNumber: matchNumber++,
        participant1: participants[i]._id,
        participant2: participants[j]._id,
        status: 'scheduled',
        winner: null
      };
      
      matches.push(match);
    }
  }
  
  return { matches, nextMatchNumber: matchNumber };
}

module.exports = {
  generateSingleEliminationBracket,
  generateRoundRobinMatches
};
