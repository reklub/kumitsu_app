const express = require('express');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const Participant = require('../models/Participant');
const Club = require('../models/Club');
const Tournament = require('../models/Tournament');
const BeltRank = require('../models/BeltRank');
const { getGenderText } = require('../utils/tournamentHelpers');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// Configure multer for temporary file storage
const upload = multer({ dest: 'uploads/temp/' });

// Serve CSV template
router.get('/templates/participants-template.csv', (req, res) => {
  res.download('public/templates/participants-template.csv');
});

// Show CSV upload form
router.get('/tournaments/:tournamentId/club/:clubId/batch-upload', authMiddleware, async (req, res) => {
  try {
    const { tournamentId, clubId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    const club = await Club.findById(clubId);
    
    if (!tournament || !club) {
      return res.status(404).send('Tournament or club not found');
    }
    
    res.render('participants/batch-upload', { tournament, club });
  } catch (error) {
    console.error('Error loading CSV upload form:', error);
    res.status(500).send('Server error');
  }
});

// Handle CSV batch upload
router.post('/tournaments/:tournamentId/club/:clubId/batch-upload', authMiddleware, upload.single('csvFile'), async (req, res) => {
  try {
    const { tournamentId, clubId } = req.params;
    
    if (!req.file) {
      req.flash('error', 'No file uploaded');
      return res.redirect(`/tournaments/${tournamentId}/club/${clubId}/batch-upload`);
    }
    
    const tournament = await Tournament.findById(tournamentId);
    const club = await Club.findById(clubId);
    
    if (!tournament || !club) {
      req.flash('error', 'Tournament or club not found');
      return res.redirect(`/tournaments/${tournamentId}`);
    }
    
    const beltRanks = await BeltRank.find();
    const beltRankMap = {};
    beltRanks.forEach(br => {
      beltRankMap[br.rank.toLowerCase()] = br._id;
    });
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const participants = [];
    
    // Parse CSV file with semicolon delimiter
    const parsePromise = new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv({ separator: ';' }))  // Use semicolon as delimiter
        .on('data', (row) => {
          // Trim all keys to handle whitespace in CSV headers
          const trimmedRow = {};
          Object.keys(row).forEach(key => {
            trimmedRow[key.trim()] = (row[key] || '').trim();
          });
          console.log(`[Batch Upload] Raw CSV row:`, trimmedRow);
          participants.push(trimmedRow);
        })
        .on('end', () => {
          console.log(`[Batch Upload] CSV parsing complete. Total rows: ${participants.length}`);
          resolve();
        })
        .on('error', (error) => {
          console.error(`[Batch Upload] CSV parsing error:`, error);
          reject(error);
        });
    });
    
    await parsePromise;
    console.log(`[Batch Upload] Starting to process ${participants.length} participants`);
    console.log(`[Batch Upload] Belt rank map:`, Object.keys(beltRankMap));
    
    // Process each participant from CSV
    for (let i = 0; i < participants.length; i++) {
      try {
        const row = participants[i];
        const rowNum = i + 2; // +2 because CSV starts at row 1 and headers are row 1
        
        // Extract fields - try different column name variations
        const firstName = row.firstName || row['First Name'] || row['first_name'] || row['FirstName'];
        const lastName = row.lastName || row['Last Name'] || row['last_name'] || row['LastName'];
        const dateOfBirth = row.dateOfBirth || row['Date of Birth'] || row['date_of_birth'] || row['DateOfBirth'];
        const gender = (row.gender || row['Gender'] || '').toLowerCase();
        const weight = parseFloat(row.weight || row['Weight']);
        const beltRank = (row.beltRank || row['Belt Rank'] || row['belt_rank'] || row['BeltRank'] || '').toLowerCase();
        
        console.log(`[Batch Upload] Row ${rowNum}: firstName="${firstName}", lastName="${lastName}", dob="${dateOfBirth}", gender="${gender}", weight="${weight}", belt="${beltRank}"`);
        
        if (!firstName || !lastName) {
          errorCount++;
          errors.push(`Row ${rowNum}: Missing first name or last name`);
          console.log(`[Batch Upload] Row ${rowNum}: Skipped - missing name`);
          continue;
        }
        
        if (!dateOfBirth) {
          errorCount++;
          errors.push(`Row ${rowNum} (${firstName} ${lastName}): Missing date of birth`);
          console.log(`[Batch Upload] Row ${rowNum}: Skipped - missing DOB`);
          continue;
        }
        
        if (!gender || !['male', 'female'].includes(gender)) {
          errorCount++;
          errors.push(`Row ${rowNum} (${firstName} ${lastName}): Invalid gender (must be 'male' or 'female')`);
          console.log(`[Batch Upload] Row ${rowNum}: Skipped - invalid gender: "${gender}"`);
          continue;
        }
        
        if (isNaN(weight) || weight <= 0) {
          errorCount++;
          errors.push(`Row ${rowNum} (${firstName} ${lastName}): Invalid weight`);
          console.log(`[Batch Upload] Row ${rowNum}: Skipped - invalid weight: "${weight}"`);
          continue;
        }
        
        if (!beltRank || !beltRankMap[beltRank]) {
          errorCount++;
          const availableBelts = Object.keys(beltRankMap).join(', ');
          errors.push(`Row ${rowNum} (${firstName} ${lastName}): Unknown belt rank '${beltRank}' (available: ${availableBelts})`);
          console.log(`[Batch Upload] Row ${rowNum}: Skipped - unknown belt rank: "${beltRank}". Available: ${availableBelts}`);
          continue;
        }
        
        // Create participant
        const newParticipant = new Participant({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: new Date(dateOfBirth),
          gender,
          weight,
          beltRank: beltRankMap[beltRank],
          club: clubId,
          tournament: tournamentId
        });
        
        const savedParticipant = await newParticipant.save();
        console.log(`[Batch Upload] ✓ Created participant: ${firstName} ${lastName} (ID: ${savedParticipant._id}, Club: ${savedParticipant.club}, Tournament: ${savedParticipant.tournament})`);
        
        // Add to club's participants list
        club.participants.push(savedParticipant._id);
        console.log(`[Batch Upload] ✓ Added to club.participants array. Current array length: ${club.participants.length}`);
        
        // Try auto-assign, but don't fail if it doesn't work
        try {
          await savedParticipant.populate('beltRank');
          const tournamentManagementController = require('../controllers/tournamentManagementController');
          const assignedCategory = await tournamentManagementController.assignParticipantToCategory(savedParticipant, tournament);
          if (assignedCategory) {
            // Update participant with the assigned category
            savedParticipant.category = assignedCategory._id;
            const updatedParticipant = await savedParticipant.save();
            console.log(`[Batch Upload] ✓ Auto-assigned to category: ${assignedCategory.name}`);
            console.log(`[Batch Upload] ✓ Participant category field after save: ${updatedParticipant.category}`);
          } else {
            console.log(`[Batch Upload] ⚠ Participant could not be matched to any category`);
          }
        } catch (categoryError) {
          console.warn(`[Batch Upload] ⚠ Could not auto-assign to category (non-critical):`, categoryError.message);
        }
        
        successCount++;
      } catch (error) {
        errorCount++;
        const rowNum = i + 2;
        errors.push(`Row ${rowNum}: ${error.message}`);
        console.error(`[Batch Upload] Row ${rowNum} error:`, error.message);
      }
    }
    
    // Save club with ALL new participants after processing all rows
    console.log(`[Batch Upload] *** BEFORE SAVE *** Club participants array:`, club.participants.map(p => p.toString()));
    console.log(`[Batch Upload] Saving club with ${club.participants.length} participants`);
    const savedClub = await club.save();
    console.log(`[Batch Upload] Club saved successfully. Saved doc:`, savedClub._id);
    
    // Verify club was saved with new participants
    const verifyClub = await Club.findById(clubId);
    console.log(`[Batch Upload] *** AFTER SAVE *** Club participants array length: ${verifyClub.participants.length}`);
    console.log(`[Batch Upload] *** AFTER SAVE *** Club participants array:`, verifyClub.participants.map(p => p.toString()));
    
    const verifyClubPopulated = await Club.findById(clubId).populate('participants');
    console.log(`[Batch Upload] *** POPULATED *** Club now has ${verifyClubPopulated.participants.length} populated participants`);
    
    // Also verify participants exist in DB directly
    const directQuery = await Participant.find({ club: clubId, tournament: tournamentId });
    console.log(`[Batch Upload] *** DIRECT QUERY *** Direct query found ${directQuery.length} participants with club=${clubId} and tournament=${tournamentId}`);
    directQuery.forEach(p => console.log(`  - ${p.firstName} ${p.lastName} (ID: ${p._id})`));
    
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // Set flash messages
    req.flash('success', `Successfully imported ${successCount} participant(s)`);
    if (errorCount > 0) {
      req.flash('error', `Failed to import ${errorCount} participant(s): ${errors.join('; ')}`);
    }
    
    res.redirect(`/tournaments/${tournamentId}/club/${clubId}`);
  } catch (error) {
    console.error('Error processing CSV:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    req.flash('error', 'Error processing CSV file: ' + error.message);
    res.redirect(`/tournaments/${tournamentId}/club/${clubId}/batch-upload`);
  }
});

// Show participant registration form (alternate route with singular 'club')
router.get('/tournaments/:tournamentId/club/:clubId/add-participant', authMiddleware, async (req, res) => {
  try {
    const { tournamentId, clubId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    const club = await Club.findById(clubId);
    const beltRanks = await BeltRank.find().sort({ order: 1 });
    
    if (!tournament || !club) {
      return res.status(404).send('Tournament or club not found');
    }
    
    res.render('participants/new', { tournament, club, beltRanks });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Server error');
  }
});

// Handle participant registration (alternate route with singular 'club')
router.post('/tournaments/:tournamentId/club/:clubId/add-participant', authMiddleware, async (req, res) => {
  try {
    const { tournamentId, clubId } = req.params;
    
    console.log('=== ADD PARTICIPANT REQUEST ===');
    console.log('Full req.body:', JSON.stringify(req.body, null, 2));
    console.log('Available keys:', Object.keys(req.body));
    
    const { firstName, lastName, dateOfBirth, gender, weight, beltRank } = req.body;
    
    console.log('Destructured values:');
    console.log('  firstName:', firstName);
    console.log('  lastName:', lastName);
    console.log('  dateOfBirth:', dateOfBirth);
    console.log('  gender:', gender);
    console.log('  weight:', weight);
    console.log('  beltRank:', beltRank);
    
    // Find the belt rank by the rank string
    const beltRankDoc = await BeltRank.findOne({ rank: beltRank });
    console.log('Looking for belt rank:', beltRank);
    console.log('Found belt rank doc:', beltRankDoc);
    
    if (!beltRankDoc) {
      console.log('Belt rank not found! Available belt ranks:');
      const allRanks = await BeltRank.find();
      allRanks.forEach(r => console.log(`  - ${r.rank}`));
      return res.status(400).send('Invalid belt rank');
    }
    
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).send('Tournament not found');
    }
    
    const newParticipant = new Participant({
      firstName,
      lastName,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      weight: Number.parseFloat(weight),
      beltRank: beltRankDoc._id,
      club: clubId,
      tournament: tournamentId
    });
    
    await newParticipant.save();
    
    // Add participant to club's participants list
    const club = await Club.findById(clubId);
    if (club) {
      club.participants.push(newParticipant._id);
      await club.save();
    }
    
    // Populate beltRank for assignment function
    await newParticipant.populate('beltRank');
    
    // Auto-assign participant to matching category
    const tournamentManagementController = require('../controllers/tournamentManagementController');
    await tournamentManagementController.assignParticipantToCategory(newParticipant, tournament);
    
    res.redirect(`/tournaments/${tournamentId}/club/${clubId}`);
  } catch (error) {
    console.error('Error registering participant:', error);
    res.status(500).send('Error registering participant');
  }
});



// Show edit participant form
router.get('/tournaments/:tournamentId/club/:clubId/participants/:participantId/edit', authMiddleware, async (req, res) => {
  try {
    const { tournamentId, clubId, participantId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    const club = await Club.findById(clubId);
    const participant = await Participant.findById(participantId).populate('beltRank');
    const beltRanks = await BeltRank.find().sort({ order: 1 });
    
    if (!tournament || !club || !participant) {
      return res.status(404).send('Tournament, club, or participant not found');
    }
    
    res.render('participants/edit', { tournament, club, participant, beltRanks });
  } catch (error) {
    console.error('Error fetching edit form:', error);
    res.status(500).send('Server error');
  }
});

// Handle participant update
router.put('/tournaments/:tournamentId/club/:clubId/participants/:participantId', authMiddleware, async (req, res) => {
  try {
    const { tournamentId, clubId, participantId } = req.params;
    const { firstName, lastName, dateOfBirth, gender, weight, beltRank } = req.body;
    
    // Find the belt rank by the rank string
    const beltRankDoc = await BeltRank.findOne({ rank: beltRank });
    
    if (!beltRankDoc) {
      return res.status(400).send('Invalid belt rank');
    }
    
    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).send('Participant not found');
    }
    
    // Update participant
    participant.firstName = firstName;
    participant.lastName = lastName;
    participant.dateOfBirth = new Date(dateOfBirth);
    participant.gender = gender;
    participant.weight = Number.parseFloat(weight);
    participant.beltRank = beltRankDoc._id;
    
    await participant.save();
    
    // Re-assign to category if needed (in case belt rank or age changed)
    const tournament = await Tournament.findById(tournamentId);
    await participant.populate('beltRank');
    
    const tournamentManagementController = require('../controllers/tournamentManagementController');
    await tournamentManagementController.assignParticipantToCategory(participant, tournament);
    
    res.redirect(`/tournaments/${tournamentId}/club/${clubId}`);
  } catch (error) {
    console.error('Error updating participant:', error);
    res.status(500).send('Error updating participant');
  }
});

// List all participants for a club in a tournament (alternate route with singular 'club')
router.get('/tournaments/:tournamentId/club/:clubId', async (req, res) => {
  try {
    console.log('=== LIST PARTICIPANTS ROUTE ===');
    console.log('Route hit successfully');
    const { tournamentId, clubId } = req.params;
    console.log('tournamentId:', tournamentId);
    console.log('clubId:', clubId);
    
    const tournament = await Tournament.findById(tournamentId);
    console.log('Tournament found:', !!tournament);
    
    // Re-fetch club from DB to ensure we get the latest participants list
    const club = await Club.findById(clubId).populate('participants');
    console.log('Club found:', !!club);
    console.log('Club participants array length:', club?.participants?.length || 0);
    
    // Query participants directly from Participant collection
    const participants = await Participant.find({ 
      tournament: tournamentId, 
      club: clubId 
    }).populate('beltRank').populate('category');
    
    // If participants don't have category set, look them up in categories
    const participantsWithCategory = await Promise.all(participants.map(async (p) => {
      if (!p.category) {
        // Find which category this participant belongs to
        const category = await require('../models/Category').findOne(
          { 
            tournament: tournamentId,
            participants: p._id 
          }
        );
        if (category) {
          p.category = category;
        }
      }
      return p;
    }));
    
    console.log('Participants found from query:', participantsWithCategory.length);
    participantsWithCategory.forEach(p => {
      console.log(`  - ${p.firstName} ${p.lastName}, Category ID: ${p.category ? p.category._id : 'null'}, Category Name: ${p.category ? p.category.name : 'none'}`);
    });
    
    if (!tournament || !club) {
      console.log('Tournament or club missing');
      return res.status(404).send('Tournament or club not found');
    }
    
    // Helper function to calculate age
    const calculateAge = (dateOfBirth) => {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    };
    
    res.render('participants/index', { tournament, club, participants: participantsWithCategory, getGenderText, calculateAge });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).send('Server error: ' + error.message);
  }
});

// Delete participant
router.delete('/tournaments/:tournamentId/club/:clubId/participants/:participantId', authMiddleware, async (req, res) => {
  try {
    const { tournamentId, clubId, participantId } = req.params;
    
    // Find and delete the participant
    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    
    // Remove from club's participants array
    await Club.findByIdAndUpdate(clubId, {
      $pull: { participants: participantId }
    });
    
    // Remove from category's participants array if assigned
    if (participant.category) {
      await require('../models/Category').findByIdAndUpdate(participant.category, {
        $pull: { participants: participantId }
      });
    }
    
    // Delete the participant
    await Participant.findByIdAndDelete(participantId);
    
    // Redirect back to club page
    res.redirect(`/tournaments/${tournamentId}/club/${clubId}`);
  } catch (error) {
    console.error('Error deleting participant:', error);
    res.status(500).json({ error: 'Error deleting participant' });
  }
});

module.exports = router;