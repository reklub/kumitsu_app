const express = require('express');
const router = express.Router();
const tournamentManagementController = require('../controllers/tournamentManagementController');
const tournamentController = require('../controllers/tournamentController');
const authMiddleware = require('../middlewares/authMiddleware');

// Tournament management page
router.get('/:tournamentId/manage', authMiddleware, tournamentController.showManagePage);

// Category management routes
router.get('/:tournamentId/categories', authMiddleware, tournamentManagementController.getCategories);
router.get('/:tournamentId/categories/new', authMiddleware, tournamentManagementController.showCreateCategoryForm);
router.post('/:tournamentId/categories', authMiddleware, tournamentManagementController.createCategory);
router.post('/:tournamentId/auto-assign', authMiddleware, tournamentManagementController.autoAssignParticipants);

// Group and bracket generation
router.post('/categories/:categoryId/generate-groups', authMiddleware, tournamentManagementController.generateGroups);
router.post('/categories/:categoryId/generate-brackets', authMiddleware, tournamentManagementController.generateBrackets);

// Tournament execution
router.post('/:tournamentId/start', authMiddleware, tournamentManagementController.startTournament);
router.get('/:tournamentId/live', authMiddleware, tournamentManagementController.getLiveTournament);
router.get('/:tournamentId/brackets', tournamentManagementController.getBrackets);

// Match management
router.put('/matches/:matchId/result', authMiddleware, tournamentManagementController.updateMatchResult);
router.post('/matches/:matchId/start', authMiddleware, tournamentManagementController.startMatch);
router.post('/matches/:matchId/cancel', authMiddleware, tournamentManagementController.cancelMatch);

// Tournament statistics and live data
router.get('/:tournamentId/current-matches', authMiddleware, tournamentManagementController.getCurrentMatches);
router.get('/:tournamentId/stats', authMiddleware, tournamentManagementController.getTournamentStats);

// Additional tournament management routes
router.post('/:tournamentId/prepare', authMiddleware, tournamentController.prepareTournament);
router.post('/:tournamentId/generate-brackets', authMiddleware, tournamentController.generateBrackets);

module.exports = router;
