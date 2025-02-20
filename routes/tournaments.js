const express = require('express');
const Tournament = require('../models/Tournament');
const tournamentController = require('../controllers/tournamentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Tworzenie turnieju (dostępne tylko dla organizatorów)
router.post('/', authMiddleware, tournamentController.createTournament);
router.get('/', async (req, res) => {
    //res.send('tournaments here');
    const tournaments = await Tournament.find({});
    res.render('tournaments/index', {tournaments})
});
router.get('/:id', tournamentController.getTournament);
router.put('/:id', authMiddleware, tournamentController.updateTournament);
router.delete('/:id', authMiddleware, tournamentController.deleteTournament);

module.exports = router;
