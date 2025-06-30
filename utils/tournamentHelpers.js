const BeltRank = require('../models/BeltRank');

// Funkcje pomocnicze dla statusu turnieju
const statusConfig = {
  'draft': { text: 'Projekt', color: 'secondary' },
  'registration_open': { text: 'Rejestracja otwarta', color: 'success' },
  'registration_closed': { text: 'Rejestracja zamknięta', color: 'warning' },
  'groups_generated': { text: 'Grupy wygenerowane', color: 'info' },
  'brackets_generated': { text: 'Drabinki wygenerowane', color: 'primary' },
  'in_progress': { text: 'W trakcie', color: 'danger' },
  'completed': { text: 'Zakończony', color: 'dark' }
};

function getStatusText(status) {
  return statusConfig[status]?.text || 'Nieznany';
}

function getStatusColor(status) {
  return statusConfig[status]?.color || 'secondary';
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
  getStatusText,
  getStatusColor,
  getBeltColors,
  getAllBeltRanks
};
