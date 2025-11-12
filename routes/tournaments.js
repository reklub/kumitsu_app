const express = require('express');
const Tournament = require('../models/Tournament');
const Club = require('../models/Club');
const Participant = require('../models/Participant');
const BeltRank = require('../models/BeltRank');
const tournamentController = require('../controllers/tournamentController');
const authMiddleware = require('../middlewares/authMiddleware');
const { getGenderText } = require('../utils/tournamentHelpers');

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
router.get('/create-tournament', authMiddleware, (req, res) => {
    res.render('tournaments/new');
});
router.post('/create-tournament', authMiddleware, async (req, res) => {
    try {
        const { name, description, startDate, endDate, registrationStartDate, registrationEndDate, location } = req.body;
        const newTournament = new Tournament({ 
            name, 
            description, 
            startDate, 
            endDate, 
            registrationStartDate, 
            registrationEndDate, 
            location,
            organizer: req.user ? req.user._id : null,
        });
        await newTournament.save();
        res.redirect('/tournaments/'); // Redirect back to the tournaments list
    } catch (error) {
        console.error('Error creating tournament:', error);
        res.status(500).send('Error creating tournament');
    }
});
router.get('/:id', async (req, res) => {
    try {
        // Find tournament by ID
        const tournament = await Tournament.findById(req.params.id).populate("clubs");
        
        // If tournament not found, show 404 page
        if (!tournament) {
            return res.status(404).send('Tournament not found');
        }
        
        // Import helper functions
        const { getGenderText } = require('../utils/tournamentHelpers');
        
        // Render the single tournament view
        res.render('tournaments/show', { 
            tournament,
            getGenderText
        });
    } catch (error) {
        console.error('Error fetching tournament:', error);
        res.status(500).send('Error fetching tournament');
    }
});

// Get tournament details with categories and participants
router.get('/:id/details', async (req, res) => {
    try {
        const Category = require('../models/Category');
        
        const tournament = await Tournament.findById(req.params.id).populate("clubs");
        
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        
        // Get all categories with participants
        const categories = await Category.find({ tournament: tournament._id })
            .populate({
                path: 'participants',
                populate: {
                    path: 'beltRank club',
                    select: 'description rank color clubName'
                }
            })
            .populate('beltRanks');
        
        res.json({
            tournament: {
                name: tournament.name,
                rank: tournament.rank || 'Nie określono',
                location: tournament.location,
                startDate: tournament.startDate,
                endDate: tournament.endDate,
                startTime: tournament.startTime || 'Nie określono',
                endTime: tournament.endTime || 'Nie określono',
                ticketPrice: tournament.ticketPrice || 0
            },
            categories: categories.map(cat => ({
                name: cat.name,
                participants: cat.participants.map(p => ({
                    firstName: p.firstName,
                    lastName: p.lastName,
                    beltRank: p.beltRank ? p.beltRank.description : 'Nie określono',
                    club: p.club ? p.club.clubName : 'Nie określono',
                    weight: p.weight,
                    gender: p.gender
                }))
            }))
        });
    } catch (error) {
        console.error('Error fetching tournament details:', error);
        res.status(500).json({ error: 'Error fetching tournament details' });
    }
});

// Get tournament data for editing
router.get('/:id/edit-data', authMiddleware, async (req, res) => {
    try {
        const Category = require('../models/Category');
        const tournament = await Tournament.findById(req.params.id);
        
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        
        const categories = await Category.find({ tournament: tournament._id });
        
        res.json({
            tournament: {
                _id: tournament._id,
                name: tournament.name,
                rank: tournament.rank,
                description: tournament.description,
                location: tournament.location,
                ticketPrice: tournament.ticketPrice,
                startDate: tournament.startDate,
                endDate: tournament.endDate,
                startTime: tournament.startTime,
                endTime: tournament.endTime,
                registrationStartDate: tournament.registrationStartDate,
                registrationEndDate: tournament.registrationEndDate,
                images: tournament.images || []
            },
            categories: categories.map(cat => ({
                _id: cat._id,
                name: cat.name,
                bracketType: cat.bracketType,
                gender: cat.gender,
                ageMin: cat.ageMin,
                ageMax: cat.ageMax,
                weightMin: cat.weightMin,
                weightMax: cat.weightMax
            }))
        });
    } catch (error) {
        console.error('Error fetching tournament edit data:', error);
        res.status(500).json({ error: 'Error fetching tournament data' });
    }
});

// Update tournament
router.post('/:id/edit', authMiddleware, async (req, res) => {
    try {
        const Category = require('../models/Category');
        const fs = require('fs').promises;
        const path = require('path');
        
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        
        // Update basic tournament fields
        tournament.name = req.body.name;
        tournament.rank = req.body.rank;
        tournament.description = req.body.description;
        tournament.location = req.body.location;
        tournament.ticketPrice = Number.parseFloat(req.body.ticketPrice) || 0;
        tournament.startDate = new Date(req.body.startDate);
        tournament.endDate = new Date(req.body.endDate);
        tournament.startTime = req.body.startTime;
        tournament.endTime = req.body.endTime;
        tournament.registrationStartDate = new Date(req.body.registrationStartDate);
        tournament.registrationEndDate = new Date(req.body.registrationEndDate);
        
        // Handle image uploads - using base64 or file buffer
        if (req.body.imagesBase64) {
            const imagesData = typeof req.body.imagesBase64 === 'string' 
                ? JSON.parse(req.body.imagesBase64) 
                : req.body.imagesBase64;
            
            const imagesDir = path.join(__dirname, '../public/uploads/tournaments');
            await fs.mkdir(imagesDir, { recursive: true });
            
            for (const imgData of imagesData) {
                if (imgData.data && imgData.name) {
                    const base64Data = imgData.data.replace(/^data:image\/\w+;base64,/, '');
                    const buffer = Buffer.from(base64Data, 'base64');
                    const filename = `${Date.now()}-${imgData.name}`;
                    const filepath = path.join(imagesDir, filename);
                    
                    await fs.writeFile(filepath, buffer);
                    
                    tournament.images.push({
                        url: `/uploads/tournaments/${filename}`,
                        filename: filename
                    });
                }
            }
        }
        
        await tournament.save();
        
        // Handle categories - parse from JSON string if sent
        if (req.body.categories) {
            let categoriesData;
            try {
                categoriesData = typeof req.body.categories === 'string' 
                    ? JSON.parse(req.body.categories) 
                    : req.body.categories;
            } catch (e) {
                categoriesData = [];
            }
            
            for (const catData of categoriesData) {
                if (catData.id === 'new' && catData.name) {
                    // Create new category
                    const newCategory = new Category({
                        name: catData.name,
                        bracketType: catData.bracketType,
                        gender: catData.gender || undefined,
                        ageMin: catData.ageMin ? Number.parseInt(catData.ageMin) : undefined,
                        ageMax: catData.ageMax ? Number.parseInt(catData.ageMax) : undefined,
                        weightMin: catData.weightMin ? Number.parseFloat(catData.weightMin) : undefined,
                        weightMax: catData.weightMax ? Number.parseFloat(catData.weightMax) : undefined,
                        tournament: tournament._id
                    });
                    await newCategory.save();
                } else if (catData.id && catData.id !== 'new') {
                    // Update existing category
                    const category = await Category.findById(catData.id);
                    if (category) {
                        category.name = catData.name;
                        category.bracketType = catData.bracketType;
                        category.gender = catData.gender || undefined;
                        category.ageMin = catData.ageMin ? Number.parseInt(catData.ageMin) : undefined;
                        category.ageMax = catData.ageMax ? Number.parseInt(catData.ageMax) : undefined;
                        category.weightMin = catData.weightMin ? Number.parseFloat(catData.weightMin) : undefined;
                        category.weightMax = catData.weightMax ? Number.parseFloat(catData.weightMax) : undefined;
                        await category.save();
                    }
                }
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating tournament:', error);
        res.status(500).json({ error: 'Error updating tournament' });
    }
});

// Delete category
router.delete('/categories/:id', authMiddleware, async (req, res) => {
    try {
        const Category = require('../models/Category');
        await Category.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Error deleting category' });
    }
});

// Delete tournament image
router.delete('/:id/images/:index', authMiddleware, async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        
        const imageIndex = Number.parseInt(req.params.index);
        if (tournament.images && tournament.images[imageIndex]) {
            const image = tournament.images[imageIndex];
            // Delete file
            try {
                const filepath = path.join(__dirname, '../public', image.url);
                await fs.unlink(filepath);
            } catch (err) {
                console.error('Error deleting image file:', err);
            }
            
            tournament.images.splice(imageIndex, 1);
            await tournament.save();
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'Error deleting image' });
    }
});

// Tournament management dashboard
router.get('/:id/manage', authMiddleware, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id).populate("clubs");
        
        if (!tournament) {
            return res.status(404).send('Tournament not found');
        }
        
        // Redirect to admin tournament management
        res.redirect(`/admin/tournaments/${tournament._id}/manage`);
    } catch (error) {
        console.error('Error fetching tournament:', error);
        res.status(500).send('Error fetching tournament');
    }
});
router.get("/:id/add-club", authMiddleware, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) {
            return res.status(404).send('Tournament not found');
        }
        
        // Check if registration is open
        const now = new Date();
        const regStart = new Date(tournament.registrationStartDate);
        const regEnd = new Date(tournament.registrationEndDate);
        const isRegistrationOpen = now >= regStart && now <= regEnd;
        
        if (!isRegistrationOpen) {
            let message = '';
            if (now < regStart) {
                message = `Rejestracja rozpocznie się ${regStart.toLocaleDateString('pl-PL')}`;
            } else if (now > regEnd) {
                message = `Rejestracja zakończyła się ${regEnd.toLocaleDateString('pl-PL')}`;
            }
            req.flash('error', message);
            return res.redirect(`/tournaments/${tournament._id}`);
        }
        
        res.render("clubs/new", { tournament });
    } catch (error) {
        console.error('Error loading add club page:', error);
        res.status(500).send('Error loading page');
    }
});

router.post('/:id/add-club', authMiddleware, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) {
            return res.status(404).send('Tournament not found');
        }
        
        // Check if registration is open
        const now = new Date();
        const regStart = new Date(tournament.registrationStartDate);
        const regEnd = new Date(tournament.registrationEndDate);
        const isRegistrationOpen = now >= regStart && now <= regEnd;
        
        if (!isRegistrationOpen) {
            let message = '';
            if (now < regStart) {
                message = `Rejestracja rozpocznie się ${regStart.toLocaleDateString('pl-PL')}`;
            } else if (now > regEnd) {
                message = `Rejestracja zakończyła się ${regEnd.toLocaleDateString('pl-PL')}`;
            }
            req.flash('error', message);
            return res.redirect(`/tournaments/${tournament._id}`);
        }
        
        const club = new Club({ 
            clubName: req.body.clubName, 
            clubCity: req.body.clubCity, 
            clubCountry: req.body.clubCountry, 
            tournament: tournament._id 
        });
        await club.save();

        // Add club to tournament's club list
        tournament.clubs.push(club._id);
        await tournament.save();

        req.flash('success', 'Klub został pomyślnie dodany do turnieju');
        res.redirect(`/tournaments/${tournament._id}`);
    } catch (error) {
        console.error('Error adding club:', error);
        req.flash('error', 'Błąd podczas dodawania klubu');
        res.redirect('back');
    }
});

router.get("/:id/club/:clubId", async (req, res) => {
    try {
        const club = await Club.findById(req.params.clubId).populate({
            path: "participants",
            populate: {
                path: "beltRank"
            }
        });
        const beltRanks = await BeltRank.find().sort({ order: 1 });
        if (!club) return res.status(404).send("Club not found");

        res.render("clubs/show", { club, beltRanks, getGenderText });
    } catch (err) {
        res.status(500).send("Error loading club management page: " + err.message);
    }
});

router.post("/:id/club/:clubId/add-participant", authMiddleware, async (req, res) => {
    try {
        const club = await Club.findById(req.params.clubId);
        const tournament = await Tournament.findById(req.params.id);
        if (!club) return res.status(404).send("Club not found");
        if (!tournament) return res.status(404).send("Tournament not found");

        // Find the belt rank by the rank string
        const beltRankDoc = await BeltRank.findOne({ rank: req.body.belt });
        if (!beltRankDoc) {
            return res.status(400).send('Invalid belt rank');
        }

        // Create new participant linked to the club
        const participant = new Participant({
            firstName: req.body.name,
            lastName: req.body.surname,
            dateOfBirth: new Date(req.body.dob),
            weight: Number.parseFloat(req.body.weight),
            beltRank: beltRankDoc._id,
            gender: req.body.sex,
            club: club._id,
            tournament: tournament._id
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