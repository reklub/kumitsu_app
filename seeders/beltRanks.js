const BeltRank = require('../models/BeltRank');

const beltRanks = [
  { rank: 'white', color: '#FFFFFF', order: 1, description: 'Biały pas' },
  { rank: 'yellow', color: '#FFFF00', order: 2, description: 'Żółty pas' },
  { rank: 'orange', color: '#FFA500', order: 3, description: 'Pomarańczowy pas' },
  { rank: 'green', color: '#008000', order: 4, description: 'Zielony pas' },
  { rank: 'blue', color: '#0000FF', order: 5, description: 'Niebieski pas' },
  { rank: 'brown', color: '#A52A2A', order: 6, description: 'Brązowy pas' },
  { rank: 'black', color: '#000000', order: 7, description: 'Czarny pas' }
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
