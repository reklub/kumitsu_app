// scripts/initBeltRanks.js
const mongoose = require('mongoose');
const seedBeltRanks = require('../seeders/beltRanks');

async function initDatabase() {
  try {
    await mongoose.connect('mongodb://localhost:27017/tournaments', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    await seedBeltRanks();
    console.log('Baza danych została zainicjalizowana');
    process.exit(0);
  } catch (error) {
    console.error('Błąd inicjalizacji:', error);
    process.exit(1);
  }
}

initDatabase();
