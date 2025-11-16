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
        
        // Get all categories with participants and beltFrom/beltTo
        const categories = await Category.find({ tournament: tournament._id })
            .populate({
                path: 'participants',
                populate: {
                    path: 'beltRank club',
                    select: 'description rank color clubName'
                }
            })
            .populate('beltFrom')
            .populate('beltTo');
        
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
        
        const categories = await Category.find({ tournament: tournament._id })
            .populate('beltFrom')
            .populate('beltTo');

        const beltRanks = await BeltRank.find().sort({ order: 1 });

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
                weightMax: cat.weightMax,
                beltFrom: cat.beltFrom ? { _id: cat.beltFrom._id, description: cat.beltFrom.description } : null,
                beltTo: cat.beltTo ? { _id: cat.beltTo._id, description: cat.beltTo.description } : null
            })),
            beltRanks: beltRanks.map(b => ({ _id: b._id, rank: b.rank, description: b.description }))
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
        
        console.log('=== EDIT TOURNAMENT REQUEST ===');
        console.log('Content-Type:', req.get('Content-Type'));
        console.log('Full req.body:', JSON.stringify(req.body, null, 2));
        console.log('Categories exists?', !!req.body.categories);
        console.log('Categories type:', typeof req.body.categories);
        console.log('Is Array?', Array.isArray(req.body.categories));
        
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        
        // Update basic tournament fields
        tournament.name = req.body.name || tournament.name;
        tournament.rank = req.body.rank || tournament.rank;
        tournament.description = req.body.description || tournament.description;
        tournament.location = req.body.location || tournament.location;
        tournament.ticketPrice = req.body.ticketPrice ? Number.parseFloat(req.body.ticketPrice) : tournament.ticketPrice;
        
        // Safely parse dates - handle both string and Date objects
        if (req.body.startDate) {
            const startDate = new Date(req.body.startDate);
            if (!isNaN(startDate.getTime())) tournament.startDate = startDate;
        }
        if (req.body.endDate) {
            const endDate = new Date(req.body.endDate);
            if (!isNaN(endDate.getTime())) tournament.endDate = endDate;
        }
        if (req.body.startTime) tournament.startTime = req.body.startTime;
        if (req.body.endTime) tournament.endTime = req.body.endTime;
        if (req.body.registrationStartDate) {
            const regStartDate = new Date(req.body.registrationStartDate);
            if (!isNaN(regStartDate.getTime())) tournament.registrationStartDate = regStartDate;
        }
        if (req.body.registrationEndDate) {
            const regEndDate = new Date(req.body.registrationEndDate);
            if (!isNaN(regEndDate.getTime())) tournament.registrationEndDate = regEndDate;
        }
        
        // Handle image uploads - using base64 array
        if (req.body.imagesBase64 && Array.isArray(req.body.imagesBase64)) {
            const imagesDir = path.join(__dirname, '../public/uploads/tournaments');
            await fs.mkdir(imagesDir, { recursive: true });
            
            for (const imgData of req.body.imagesBase64) {
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
        
        // Handle categories
        if (req.body.categories && Array.isArray(req.body.categories)) {
            const categoriesData = req.body.categories;
            console.log('Parsed categories data:', JSON.stringify(categoriesData, null, 2));

            for (const catData of categoriesData) {
                try {
                    console.log('Processing category:', catData);
                    // beltFrom / beltTo are expected to be BeltRank ids (string) or empty/null
                    const beltFromId = catData.beltFrom && catData.beltFrom !== '' ? catData.beltFrom : null;
                    const beltToId = catData.beltTo && catData.beltTo !== '' ? catData.beltTo : null;

                    if (catData.id === 'new' && catData.name) {
                        // Create new category
                        console.log('Creating new category:', catData.name);
                        const newCategory = new Category({
                            name: catData.name,
                            bracketType: catData.bracketType || 'single_elimination',
                            gender: catData.gender && catData.gender !== '' ? catData.gender : null,
                            ageMin: catData.ageMin ? Number.parseInt(catData.ageMin) : null,
                            ageMax: catData.ageMax ? Number.parseInt(catData.ageMax) : null,
                            weightMin: catData.weightMin ? Number.parseFloat(catData.weightMin) : null,
                            weightMax: catData.weightMax ? Number.parseFloat(catData.weightMax) : null,
                            beltFrom: beltFromId,
                            beltTo: beltToId,
                            tournament: tournament._id
                        });
                        const savedCategory = await newCategory.save();
                        console.log('Saved new category:', savedCategory._id);
                    } else if (catData.id && catData.id !== 'new') {
                        // Update existing category
                        console.log('Updating existing category:', catData.id);
                        const category = await Category.findById(catData.id);
                        if (category) {
                            category.name = catData.name;
                            category.bracketType = catData.bracketType || 'single_elimination';
                            category.gender = catData.gender && catData.gender !== '' ? catData.gender : null;
                            category.ageMin = catData.ageMin ? Number.parseInt(catData.ageMin) : null;
                            category.ageMax = catData.ageMax ? Number.parseInt(catData.ageMax) : null;
                            category.weightMin = catData.weightMin ? Number.parseFloat(catData.weightMin) : null;
                            category.weightMax = catData.weightMax ? Number.parseFloat(catData.weightMax) : null;
                            category.beltFrom = beltFromId;
                            category.beltTo = beltToId;
                            await category.save();
                            console.log('Updated category:', catData.id);
                        }
                    }
                } catch (catError) {
                    console.error('Error processing category:', catError);
                    // Continue processing other categories
                }
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating tournament:', error);
        res.status(500).json({ error: error.message || 'Error updating tournament' });
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

        console.log('=== ADD PARTICIPANT REQUEST (tournaments route) ===');
        console.log('Body:', req.body);
        console.log('Looking for belt rank:', req.body.beltRank);
        
        // Find the belt rank by the rank string
        const beltRankDoc = await BeltRank.findOne({ rank: req.body.beltRank });
        console.log('Found belt rank doc:', beltRankDoc);
        
        if (!beltRankDoc) {
            console.log('Belt rank not found! Available belt ranks:');
            const allRanks = await BeltRank.find();
            allRanks.forEach(r => console.log(`  - ${r.rank}`));
            return res.status(400).send('Invalid belt rank');
        }

        // Create new participant linked to the club
        const participant = new Participant({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            dateOfBirth: new Date(req.body.dateOfBirth),
            weight: Number.parseFloat(req.body.weight),
            beltRank: beltRankDoc._id,
            gender: req.body.gender,
            club: club._id,
            tournament: tournament._id
        });

        await participant.save(); // Save participant to DB

        // Populate beltRank for assignment function
        await participant.populate('beltRank');

        // Add participant's ID to the club
        club.participants.push(participant._id);
        await club.save(); // Save club update

        // Auto-assign participant to matching category
        const tournamentManagementController = require('../controllers/tournamentManagementController');
        await tournamentManagementController.assignParticipantToCategory(participant, tournament);

        res.redirect(`/tournaments/${tournament._id}/club/${club._id}`);
    } catch (err) {
        res.status(500).send("Error adding participant: " + err.message);
    }
});

router.put('/:id', authMiddleware, tournamentController.updateTournament);
router.delete('/:id', authMiddleware, tournamentController.deleteTournament);

module.exports = router;