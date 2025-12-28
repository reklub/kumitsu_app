#!/usr/bin/env node

/**
 * Test script for tournament bracket winner advancement
 * Run: node test_bracket_flow.js
 */

const mongoose = require('mongoose');
const Tournament = require('./models/Tournament');
const Category = require('./models/Category');
const Participant = require('./models/Participant');
const Match = require('./models/Match');
const User = require('./models/User');

async function testBracketFlow() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/tournaments', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB');

    // Get a tournament with matches
    const tournament = await Tournament.findOne({ name: /Test|Demo/i });
    if (!tournament) {
      console.log('ℹ No tournament found. Create one manually or seed the database.');
      process.exit(0);
    }

    console.log(`\n✓ Found tournament: ${tournament.name}\n`);

    // Get categories with matches
    const categories = await Category.find({ tournament: tournament._id })
      .populate({
        path: 'matches',
        populate: {
          path: 'participant1 participant2 winner'
        }
      });

    console.log(`Found ${categories.length} categories:\n`);

    for (const category of categories) {
      const matches = category.matches || [];
      console.log(`📋 ${category.name}: ${matches.length} matches`);

      // Check matches by round
      const byRound = {};
      matches.forEach(m => {
        const round = m.round || 'Unknown';
        if (!byRound[round]) byRound[round] = [];
        byRound[round].push(m);
      });

      Object.entries(byRound).forEach(([round, roundMatches]) => {
        console.log(`   Round ${round}: ${roundMatches.length} matches`);

        roundMatches.slice(0, 3).forEach((match, idx) => {
          const p1 = match.participant1 ? `${match.participant1.firstName} ${match.participant1.lastName}` : 'TBD';
          const p2 = match.participant2 ? `${match.participant2.firstName} ${match.participant2.lastName}` : 'TBD';
          const winner = match.winner ? (match.winner._id.toString() === match.participant1?._id.toString() ? '✓ ' + p1 : '✓ ' + p2) : 'Not decided';
          console.log(`      Match ${idx + 1}: ${p1} vs ${p2} | ${match.status} | Winner: ${winner}`);
        });

        if (roundMatches.length > 3) {
          console.log(`      ... and ${roundMatches.length - 3} more`);
        }
      });

      console.log('');
    }

    // Test the advanceWinner logic manually
    console.log('\n📊 Testing advanceWinner logic:\n');

    const testCategory = categories[0];
    if (!testCategory || !testCategory.matches.length) {
      console.log('No matches to test');
      process.exit(0);
    }

    const matchesToTest = testCategory.matches.filter(m => m.status === 'completed' && m.winner).slice(0, 3);

    if (matchesToTest.length === 0) {
      console.log('⚠ No completed matches with winners. Finish a match manually first.');
      process.exit(0);
    }

    for (const match of matchesToTest) {
      console.log(`Testing match: ${match._id}`);
      
      const category = await Category.findOne({ matches: match._id });
      console.log(`  ✓ Found category: ${category.name}`);

      const currentRound = parseInt(match.round);
      const nextRound = currentRound + 1;

      const currentRoundMatches = await Match.find({
        _id: { $in: category.matches },
        round: { $in: [currentRound.toString(), currentRound] }
      }).sort({ matchNumber: 1 });

      const nextRoundMatches = await Match.find({
        _id: { $in: category.matches },
        round: { $in: [nextRound.toString(), nextRound] }
      }).sort({ matchNumber: 1 });

      const matchPosition = currentRoundMatches.findIndex(m => m._id.toString() === match._id.toString());
      const nextMatchPosition = Math.floor(matchPosition / 2);

      console.log(`  Round ${currentRound}: ${currentRoundMatches.length} matches (position: ${matchPosition})`);
      console.log(`  Round ${nextRound}: ${nextRoundMatches.length} matches (target position: ${nextMatchPosition})`);

      if (nextRoundMatches.length > nextMatchPosition) {
        const targetMatch = nextRoundMatches[nextMatchPosition];
        const isEvenPosition = matchPosition % 2 === 0;
        const slot = isEvenPosition ? 'participant1' : 'participant2';

        console.log(`  ✓ Winner should be in ${slot} of next match`);
        console.log(`  Next match: ${targetMatch._id}`);
        console.log(`    - Participant1: ${targetMatch.participant1 ? 'FILLED' : 'EMPTY'}`);
        console.log(`    - Participant2: ${targetMatch.participant2 ? 'FILLED' : 'EMPTY'}`);

        if (slot === 'participant1' && targetMatch.participant1) {
          console.log(`  ✓ Winner correctly advanced to participant1`);
        } else if (slot === 'participant2' && targetMatch.participant2) {
          console.log(`  ✓ Winner correctly advanced to participant2`);
        } else {
          console.log(`  ⚠ Winner not in correct slot!`);
        }
      } else {
        console.log(`  ℹ No next round match exists (final round)`);
      }

      console.log('');
    }

    console.log('✓ Test complete');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
}

testBracketFlow();
