const express = require('express');
const Tournament = require('../models/Tournament');
const tournamentController = require('../controllers/tournamentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Tworzenie turnieju (dostępne tylko dla organizatorów)
router.post('/', authMiddleware, tournamentController.createTournament);
router.get('/', tournamentController.getTournaments);
router.get('/:id', tournamentController.getTournament);
router.put('/:id', authMiddleware, tournamentController.updateTournament);
router.delete('/:id', authMiddleware, tournamentController.deleteTournament);

module.exports = router;
