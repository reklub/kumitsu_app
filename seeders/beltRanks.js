const BeltRank = require('../models/BeltRank');

const beltRanks = [
  { rank: '10.1 kyu', color: '#FFFFFF', order: 1, description: '10.1 kyu' },
  { rank: '10.2 kyu', color: '#FFFFFF', order: 2, description: '10.2 kyu' },
  { rank: '10.3 kyu', color: '#FFFFFF', order: 3, description: '10.3 kyu' },
  { rank: '9.1 kyu', color: '#FFFFFF', order: 4, description: '9.1 kyu' },
  { rank: '9.2 kyu', color: '#FFFFFF', order: 5, description: '9.2 kyu' },
  { rank: '9.3 kyu', color: '#FFFFFF', order: 6, description: '9.3 kyu' },
  { rank: '8.1 kyu', color: '#FFFFFF', order: 7, description: '8.1 kyu' },
  { rank: '8.2 kyu', color: '#FFFFFF', order: 8, description: '8.2 kyu' },
  { rank: '8.3 kyu', color: '#FFFFFF', order: 9, description: '8.3 kyu' },
  { rank: '7.1 kyu', color: '#FFFFFF', order: 10, description: '7.1 kyu' },
  { rank: '7.2 kyu', color: '#FFFFFF', order: 11, description: '7.2 kyu' },
  { rank: '7.3 kyu', color: '#FFFFFF', order: 12, description: '7.3 kyu' },
  { rank: '6.1 kyu', color: '#FFFFFF', order: 13, description: '6.1 kyu' },
  { rank: '6.2 kyu', color: '#FFFFFF', order: 14, description: '6.2 kyu' },
  { rank: '6.3 kyu', color: '#FFFFFF', order: 15, description: '6.3 kyu' },
  { rank: '5.1 kyu', color: '#FFFFFF', order: 16, description: '5.1 kyu' },
  { rank: '5.2 kyu', color: '#FFFFFF', order: 17, description: '5.2 kyu' },
  { rank: '5.3 kyu', color: '#FFFFFF', order: 18, description: '5.3 kyu' },
  { rank: '10 kyu', color: '#FFFFFF', order: 19, description: '10 kyu' },
  { rank: '9 kyu', color: '#FFFFFF', order: 20, description: '9 kyu' },
  { rank: '8 kyu', color: '#FFFFFF', order: 21, description: '8 kyu' },
  { rank: '7 kyu', color: '#FFFFFF', order: 22, description: '7 kyu' },
  { rank: '6 kyu', color: '#FFFFFF', order: 23, description: '6 kyu' },
  { rank: '5 kyu', color: '#FFFFFF', order: 24, description: '5 kyu' },
  { rank: '4 kyu', color: '#FFFFFF', order: 25, description: '4 kyu' },
  { rank: '3 kyu', color: '#FFFFFF', order: 26, description: '3 kyu' },
  { rank: '2 kyu', color: '#FFFFFF', order: 27, description: '2 kyu' },
  { rank: '1 kyu', color: '#FFFFFF', order: 28, description: '1 kyu' },
  { rank: '1 dan', color: '#000000', order: 29, description: '1 dan' },
  { rank: '2 dan', color: '#000000', order: 30, description: '2 dan' },
  { rank: '3 dan', color: '#000000', order: 31, description: '3 dan' },
  { rank: '4 dan', color: '#000000', order: 32, description: '4 dan' },
  { rank: '5 dan', color: '#000000', order: 33, description: '5 dan' },
  { rank: '6 dan', color: '#000000', order: 34, description: '6 dan' }
];

async function seedBeltRanks() {
  try {
    await BeltRank.deleteMany({});
    await BeltRank.insertMany(beltRanks);
    console.log('Stopnie pasów zostały dodane do bazy danych');
  } catch (error) {
    console.error('Błąd podczas dodawania stopni pasów:', error);
  }
}

module.exports = seedBeltRanks;
