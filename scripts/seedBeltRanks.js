const mongoose = require('mongoose');
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
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/tournaments', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Check if belt ranks already exist
    const existingRanks = await BeltRank.countDocuments();
    if (existingRanks > 0) {
      console.log('Belt ranks already exist in the database');
      return;
    }
    
    // Insert belt ranks
    await BeltRank.insertMany(beltRanks);
    console.log('Belt ranks seeded successfully');
    
  } catch (error) {
    console.error('Error seeding belt ranks:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
seedBeltRanks();



