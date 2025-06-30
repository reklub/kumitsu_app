const Tournament = require('../models/Tournament');
const tournamentController = require('../controllers/tournamentController');

// routes/admin.js
router.post('/tournaments/:id/close-registration', tournamentController.closeRegistration);
router.post('/tournaments/:id/generate-groups', tournamentController.generateGroups);
router.post('/tournaments/:id/generate-brackets', tournamentController.generateBrackets);
router.post('/tournaments/:id/move-participant', tournamentController.moveParticipant);
router.get('/tournaments/:id/manage', tournamentController.showManagePage);
