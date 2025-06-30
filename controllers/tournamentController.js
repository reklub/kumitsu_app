const Tournament = require('../models/Tournament');
const { BracketsManager } = require('brackets-manager');
const { JsonDatabase } = require('brackets-json-db');
const { getStatusText, getStatusColor, getBeltColors, getAllBeltRanks } = require('../utils/tournamentHelpers');

// Create a tournament
exports.createTournament = async (req, res) => {
  const { name, startDate, endDate, registrationStart, registrationEnd, description, location } = req.body;
  
  try {
    const tournament = new Tournament({
      name,
      startDate,
      endDate,
      registrationStart,
      registrationEnd,
      description,
      location,
      organizer: req.user._id
    });

    await tournament.save();
    res.status(201).json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Error creating tournament' });
  }
};

// Get all tournaments
exports.getTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find().populate('organizer', 'name email');
    res.status(200).json(tournaments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tournaments' });
  }
};

// Get a specific tournament
exports.getTournament = async (req, res) => {
  const { id } = req.params;
  
  try {
    const tournament = await Tournament.findById(id).populate('organizer', 'name email');
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.status(200).json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tournament' });
  }
};

// Update a tournament
exports.updateTournament = async (req, res) => {
  const { id } = req.params;
  const { name, startDate, endDate, location } = req.body;
  
  try {
    const tournament = await Tournament.findByIdAndUpdate(id, {
      name,
      startDate,
      endDate,
      location
    }, { new: true });

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.status(200).json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Error updating tournament' });
  }
};

// Delete a tournament
exports.deleteTournament = async (req, res) => {
  const { id } = req.params;
  
  try {
    const tournament = await Tournament.findByIdAndDelete(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.status(200).json({ message: 'Tournament deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting tournament' });
  }
};

exports.closeRegistration = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    tournament.status = 'registration_closed';
    await tournament.save();
    
    req.flash('success', 'Rejestracja została zamknięta');
    res.redirect(`/admin/tournaments/${tournament._id}/manage`);
  } catch (error) {
    req.flash('error', 'Błąd podczas zamykania rejestracji');
    res.redirect('back');
  }
};

exports.generateGroups = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('participants');
    
    const { groupSize = 4 } = req.body;
    const participants = tournament.participants.filter(p => p.isActive);
    
    // Algorytm podziału na grupy
    const groups = divideIntoGroups(participants, groupSize);
    
    tournament.groups = groups;
    tournament.status = 'groups_generated';
    await tournament.save();
    
    res.json({ success: true, groups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generateBrackets = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('participants');
    
    const storage = new JsonDatabase();
    const manager = new BracketsManager(storage);
    
    // Generowanie drabinek na podstawie typu turnieju
    const seeding = tournament.participants.map(p => p.name);
    
    await manager.create.stage({
      tournamentId: tournament._id,
      name: 'Main Stage',
      type: tournament.tournamentType,
      seeding: seeding,
      settings: {
        grandFinal: tournament.tournamentType === 'double_elimination' ? 'double' : 'simple'
      }
    });
    
    const brackets = await storage.select('match');
    tournament.brackets = brackets;
    tournament.status = 'brackets_generated';
    await tournament.save();
    
    res.json({ success: true, brackets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Funkcja pomocnicza do podziału na grupy
function divideIntoGroups(participants, groupSize) {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const groups = [];
  
  for (let i = 0; i < shuffled.length; i += groupSize) {
    groups.push({
      name: `Grupa ${String.fromCharCode(65 + Math.floor(i / groupSize))}`,
      participants: shuffled.slice(i, i + groupSize)
    });
  }
  
  return groups;
}

exports.showManagePage = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('participants');

    console.log('Tournament status:', tournament.status); // Debug

    res.render('admin/tournament-manage', {
      tournament,
      participants: tournament.participants || [],
      getStatusText,  // WAŻNE: te funkcje muszą być przekazane
      getStatusColor  // WAŻNE: te funkcje muszą być przekazane
    });
  } catch (error) {
    console.error('Error in showManagePage:', error);
    req.flash('error', 'Błąd podczas ładowania turnieju');
    res.redirect('/admin/tournaments');
  }
};

exports.showTournamentList = async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .populate('participants')
      .sort({ createdAt: -1 });

    res.render('admin/tournaments', {
      tournaments,
      getStatusText,
      getStatusColor
    });
  } catch (error) {
    req.flash('error', 'Błąd podczas ładowania turniejów');
    res.redirect('/admin');
  }
};