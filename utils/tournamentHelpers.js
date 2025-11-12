const BeltRank = require('../models/BeltRank');

// Function to format gender display
function getGenderText(gender) {
  if (gender === 'male') return 'Male';
  if (gender === 'female') return 'Female';
  return gender; // fallback to original value
}

// Funkcja do pobierania kolorów pasów z bazy
async function getBeltColors() {
  try {
    const beltRanks = await BeltRank.find().sort({ order: 1 });
    return beltRanks.reduce((acc, belt) => {
      acc[belt.rank] = belt.color;
      return acc;
    }, {});
  } catch (error) {
    console.error('Błąd podczas pobierania kolorów pasów:', error);
    return {};
  }
}

async function getAllBeltRanks() {
  try {
    return await BeltRank.find().sort({ order: 1 });
  } catch (error) {
    console.error('Błąd podczas pobierania stopni pasów:', error);
    return [];
  }
}

module.exports = {
  getBeltColors,
  getAllBeltRanks,
  getGenderText
};
