const express = require('express');
const Tournament = require('../models/Tournament');
const Club = require('../models/Club');
const tournamentController = require('../controllers/tournamentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Tworzenie turnieju (dostępne tylko dla organizatorów)
router.post('/', authMiddleware, tournamentController.createTournament);
router.get('/', async (req, res) => {
    try {
        // Fetch all tournaments from the database and sort them by date (ascending)
        const tournaments = await Tournament.find({ date: { $gte: new Date() } })
                                             .sort({ date: 1 });  // 1 for ascending order
        
        res.render('tournaments/index', { tournaments });
    } catch (error) {
        console.error('Error fetching tournaments:', error);
        res.status(500).send('Error fetching tournaments');
    }
});
router.get('/create-tournament', (req, res) => {
    res.render('tournaments/new');
});
router.post('/create-tournament', async (req, res) => {
    try {
        const { name, description, date, location } = req.body;
        const newTournament = new Tournament({ name, date, description, location });
        await newTournament.save();
        res.redirect('/tournaments/'); // Redirect back to the tournaments list
    } catch (error) {
        console.error('Error creating tournament:', error);
        res.status(500).send('Error creating tournament');
    }
});
//router.get('/:id', tournamentController.getTournament);
router.get('/:id', async (req, res) => {
    try {
        // Find tournament by ID
        const tournament = await Tournament.findById(req.params.id).populate("clubs");
        
        // If tournament not found, show 404 page
        if (!tournament) {
            return res.status(404).send('Tournament not found');
        }
        
        // Render the single tournament view
        res.render('tournaments/show', { tournament });
    } catch (error) {
        console.error('Error fetching tournament:', error);
        res.status(500).send('Error fetching tournament');
    }
});
router.get("/:id/add-club", async (req, res) => {
    const tournament = await Tournament.findById(req.params.id);
    res.render("clubs/new", { tournament });
});
router.post('/:id/add-club', async (req, res) => {
    const tournament = await Tournament.findById(req.params.id);
    const club = new Club({ clubName: req.body.clubName, clubCity: req.body.clubCity, clubCountry: req.body.clubCountry, tournament: tournament._id });
    await club.save();

    // Add club to tournament's club list
    tournament.clubs.push(club._id);
    await tournament.save();

    res.redirect(`/tournaments/${tournament._id}`);
});
router.put('/:id', authMiddleware, tournamentController.updateTournament);
router.delete('/:id', authMiddleware, tournamentController.deleteTournament);

module.exports = router;