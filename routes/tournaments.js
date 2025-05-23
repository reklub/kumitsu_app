const express = require('express');
const Tournament = require('../models/Tournament');
const Club = require('../models/Club');
const Participant = require('../models/Participant');
const tournamentController = require('../controllers/tournamentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Tworzenie turnieju (dostępne tylko dla organizatorów)
router.post('/', authMiddleware, tournamentController.createTournament);
router.get('/', async (req, res) => {
    try {
        // Fetch all tournaments from the database and sort them by date (ascending)
        const tournaments = await Tournament.find({ startDate: { $gte: new Date() } })
                                             .sort({ startDate: 1 });  // 1 for ascending order
        
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
        const { name, description, startDate, endDate, registrationStartDate, registrationEndDate, location } = req.body;
        const newTournament = new Tournament({ name, description, startDate, endDate, registrationStartDate, registrationEndDate, location });
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

router.get("/:id/club/:clubId", async (req, res) => {
    try {
        const club = await Club.findById(req.params.clubId).populate("participants");
        if (!club) return res.status(404).send("Club not found");

        res.render("clubs/show", { club });
    } catch (err) {
        res.status(500).send("Error loading club management page: " + err.message);
    }
});

router.post("/:id/club/:clubId/add-participant", async (req, res) => {
    try {
        //const { name, surname, dob, weight, belt, sex } = req.body;
        const club = await Club.findById(req.params.clubId);
        const tournament = await Tournament.findById(req.params.id);
        if (!club) return res.status(404).send("Club not found");

        // Create new participant linked to the club
        const participant = new Participant({
            firstName: req.body.name,
            lastName: req.body.surname,
            dateOfBirth: new Date(req.body.dob),
            weight: parseFloat(req.body.weight),
            beltRank: req.body.belt,
            gender: req.body.sex,
            //category,
            club: club._id // Link participant to this club

        });

        await participant.save(); // Save participant to DB

        // Add participant's ID to the club
        club.participants.push(participant._id);
        await club.save(); // Save club update

        res.redirect(`/tournaments/${tournament._id}/club/${club._id}`);
    } catch (err) {
        res.status(500).send("Error adding participant: " + err.message);
    }
});

router.put('/:id', authMiddleware, tournamentController.updateTournament);
router.delete('/:id', authMiddleware, tournamentController.deleteTournament);

module.exports = router;