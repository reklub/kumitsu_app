/**
 * Test script to verify winner advancement logic in tournaments
 * Run this after setting up a tournament to debug winner advancement
 */

const mongoose = require('mongoose');
const Tournament = require('./models/Tournament');
const Category = require('./models/Category');
const Match = require('./models/Match');
const Participant = require('./models/Participant');

async function testWinnerAdvancement() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/tournaments');
    
    // Find a recent tournament
    const tournament = await Tournament.findOne().sort({ createdAt: -1 });
    if (!tournament) {
      console.log('No tournament found');
      return;
    }
    
    console.log(`\n=== Testing Tournament: ${tournament.name} ===\n`);
    
    // Get all categories
    const categories = await Category.find({ tournament: tournament._id });
    
    for (const category of categories) {
      console.log(`\n--- Category: ${category.name} ---`);
      
      // Get all matches for this category
      const matches = await Match.find({ category: category._id })
        .populate('participant1 participant2 winner')
        .sort({ round: 1, matchNumber: 1 });
      
      if (matches.length === 0) {
        console.log('No matches found');
        continue;
      }
      
      // Group by round
      const roundGroups = {};
      matches.forEach(match => {
        if (!roundGroups[match.round]) {
          roundGroups[match.round] = [];
        }
        roundGroups[match.round].push(match);
      });
      
      // Check each round
      for (const roundKey in roundGroups) {
        const roundMatches = roundGroups[roundKey];
        console.log(`\n  Round ${roundKey}:`);
        
        roundMatches.forEach((match, idx) => {
          const p1Name = match.participant1 ? `${match.participant1.firstName} ${match.participant1.lastName}` : 'TBD';
          const p2Name = match.participant2 ? `${match.participant2.firstName} ${match.participant2.lastName}` : 'TBD';
          const winnerName = match.winner ? `${match.winner.firstName} ${match.winner.lastName}` : 'None';
          const score = `${match.score1} - ${match.score2}`;
          const status = match.status;
          
          console.log(`    Match ${match.matchNumber}: ${p1Name} vs ${p2Name} | ${score} | Winner: ${winnerName} | Status: ${status}`);
          
          // Verify winner advancement
          if (match.status === 'completed' && match.winner) {
            const nextRound = parseInt(roundKey) + 1;
            const nextMatches = roundGroups[nextRound] || [];
            
            const isInNextRound = nextMatches.some(m => {
              const p1Match = m.participant1 && m.participant1._id.toString() === match.winner._id.toString();
              const p2Match = m.participant2 && m.participant2._id.toString() === match.winner._id.toString();
              return p1Match || p2Match;
            });
            
            const advancementStatus = isInNextRound ? '✓ Advanced' : '✗ NOT Advanced';
            console.log(`      ${advancementStatus} to Round ${nextRound}`);
          }
        });
      }
    }
    
    console.log('\n=== Test Complete ===\n');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
testWinnerAdvancement().catch(console.error);
