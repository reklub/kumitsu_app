const Tournament = require('../models/Tournament');

// Create a tournament
exports.createTournament = async (req, res) => {
  const { name, startDate, endDate, location } = req.body;
  
  try {
    const tournament = new Tournament({
      name,
      startDate,
      endDate,
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
