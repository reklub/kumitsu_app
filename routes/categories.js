const express = require('express');
const Category = require('../models/Category');
const Tournament = require('../models/Tournament');
const Participant = require('../models/Participant');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// List categories for a tournament
router.get('/tournaments/:tournamentId/categories', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    const categories = await Category.find({ tournament: tournamentId });
    
    if (!tournament) {
      return res.status(404).send('Tournament not found');
    }
    
    res.render('categories/index', { tournament, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).send('Server error');
  }
});

// Show create category form
router.get('/tournaments/:tournamentId/categories/new', authMiddleware, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      return res.status(404).send('Tournament not found');
    }
    
    // Check if user is the tournament organizer
    if (tournament.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).send('Unauthorized');
    }
    
    res.render('categories/new', { tournament });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
});

// Create category
router.post('/tournaments/:tournamentId/categories', authMiddleware, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { name, ageMin, ageMax, weightMin, weightMax, gender, beltRanks } = req.body;
    
    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      return res.status(404).send('Tournament not found');
    }
    
    // Check if user is the tournament organizer
    if (tournament.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).send('Unauthorized');
    }
    
    const newCategory = new Category({
      name,
      ageMin,
      ageMax,
      weightMin,
      weightMax,
      gender,
      beltRanks: Array.isArray(beltRanks) ? beltRanks : [beltRanks],
      tournament: tournamentId
    });
    
    await newCategory.save();
    
    res.redirect(`/tournaments/${tournamentId}/categories`);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).send('Error creating category');
  }
});

// Auto-assign participants to categories
router.post('/tournaments/:tournamentId/assign-categories', authMiddleware, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      return res.status(404).send('Tournament not found');
    }
    
    // Check if user is the tournament organizer
    if (tournament.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).send('Unauthorized');
    }
    
    // Get all categories and participants for this tournament
    const categories = await Category.find({ tournament: tournamentId });
    const participants = await Participant.find({ tournament: tournamentId, category: null });
    
    // Logic to assign participants to categories based on age, weight, gender, and belt
    for (const participant of participants) {
      // Calculate age based on date of birth
      const ageInYears = calculateAge(participant.dateOfBirth);
      
      // Find matching category
      const matchingCategory = categories.find(cat => {
        return (
          ageInYears >= cat.ageMin &&
          ageInYears <= cat.ageMax &&
          participant.weight >= cat.weightMin &&
          participant.weight <= cat.weightMax &&
          (cat.gender === participant.gender || cat.gender === 'mixed') &&
          cat.beltRanks.includes(participant.beltRank)
        );
      });
      
      if (matchingCategory) {
        participant.category = matchingCategory._id;
        await participant.save();
        
        // Update category's participants array
        matchingCategory.participants.push(participant._id);
        await matchingCategory.save();
      }
    }
    
    res.redirect(`/tournaments/${tournamentId}/categories`);
  } catch (error) {
    console.error('Error assigning categories:', error);
    res.status(500).send('Error assigning categories');
  }
});

// Helper function to calculate age
function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

module.exports = router;