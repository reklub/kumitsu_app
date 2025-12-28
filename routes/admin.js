const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const tournamentController = require('../controllers/tournamentController');
const authMiddleware = require('../middlewares/authMiddleware');

// Admin dashboard
router.get('/', authMiddleware, (req, res) => {
    res.render('admin/dashboard');
});

// Tournament management routes
router.get('/tournaments', authMiddleware, tournamentController.showTournamentList);
router.get('/tournaments/:id/brackets', authMiddleware, tournamentController.showBrackets);
router.post('/tournaments/:id/prepare', authMiddleware, tournamentController.prepareTournament);
router.post('/tournaments/:id/generate-brackets', authMiddleware, tournamentController.generateBrackets);
router.post('/tournaments/:id/generate-groups', authMiddleware, tournamentController.generateGroups);
router.post('/tournaments/:id/move-participant', authMiddleware, tournamentController.moveParticipant);
router.get('/tournaments/:id/manage', authMiddleware, tournamentController.showManagePage);

module.exports = router;
