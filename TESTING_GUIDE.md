# Testing Guide - CSV Batch Upload Feature

## Pre-Testing Checklist

- [ ] MongoDB is running
- [ ] Application server started (`node app.js`)
- [ ] Logged in as authenticated user
- [ ] Have a tournament and club created
- [ ] Have at least one belt rank configured in the database

## Manual Testing Steps

### Test 1: Access the Upload Form

**Steps:**
1. Navigate to Tournaments page
2. Click on a tournament
3. Click on a club
4. Click "Batch Upload (CSV)" button

**Expected Result:**
- Upload form displays
- "Download CSV Template" button is visible
- Instructions show available belt ranks
- Drag & drop area is visible

---

### Test 2: Download Template

**Steps:**
1. On the batch upload form, click "Download CSV Template"
2. Open the downloaded file in a text editor

**Expected Result:**
- File downloads as `participants-template.csv`
- Contains proper CSV format with headers and example data
- Can open in Excel/Sheets/text editor

---

### Test 3: Upload Valid CSV

**Steps:**
1. Create/download CSV file with valid data:
   ```csv
   firstName,lastName,dateOfBirth,gender,weight,beltRank
   John,Doe,2005-03-15,male,75.5,white
   Jane,Smith,2006-07-22,female,62.3,yellow
   ```
2. Upload the file
3. Click "Upload and Import Participants"

**Expected Result:**
- Success message: "Successfully imported 2 participant(s)"
- Redirects to participants list
- Both participants visible in the table
- Participants are assigned to categories

---

### Test 4: Drag & Drop Upload

**Steps:**
1. Create a valid CSV file on your computer
2. Drag the file from file explorer into the drag-drop area
3. File name should appear in the "Selected file" alert
4. Submit the form

**Expected Result:**
- File is accepted
- Upload processes successfully
- Participants are imported

---

### Test 5: Invalid Gender

**Steps:**
1. Create CSV with invalid gender:
   ```csv
   firstName,lastName,dateOfBirth,gender,weight,beltRank
   John,Doe,2005-03-15,other,75.5,white
   ```
2. Upload the file

**Expected Result:**
- Error message: "Row 2 (John Doe): Invalid gender (must be 'male' or 'female')"
- Error count: 1
- No participants imported

---

### Test 6: Invalid Date Format

**Steps:**
1. Create CSV with wrong date format:
   ```csv
   firstName,lastName,dateOfBirth,gender,weight,beltRank
   John,Doe,03/15/2005,male,75.5,white
   ```
2. Upload the file

**Expected Result:**
- Error message: "Row 2 (John Doe): [error details]"
- Participant not imported

---

### Test 7: Unknown Belt Rank

**Steps:**
1. Create CSV with non-existent belt rank:
   ```csv
   firstName,lastName,dateOfBirth,gender,weight,beltRank
   John,Doe,2005-03-15,male,75.5,nonexistent
   ```
2. Upload the file

**Expected Result:**
- Error message: "Row 2 (John Doe): Unknown belt rank 'nonexistent'"
- Error count: 1

---

### Test 8: Missing Required Field

**Steps:**
1. Create CSV missing firstName:
   ```csv
   firstName,lastName,dateOfBirth,gender,weight,beltRank
   ,Doe,2005-03-15,male,75.5,white
   ```
2. Upload the file

**Expected Result:**
- Error message: "Row 2: Missing first name or last name"
- Participant not imported

---

### Test 9: Invalid Weight

**Steps:**
1. Create CSV with invalid weight:
   ```csv
   firstName,lastName,dateOfBirth,gender,weight,beltRank
   John,Doe,2005-03-15,male,-75.5,white
   Jane,Smith,2006-07-22,female,abc,yellow
   ```
2. Upload the file

**Expected Result:**
- Error messages for both rows about invalid weight
- No participants imported

---

### Test 10: Mixed Valid and Invalid

**Steps:**
1. Create CSV with mix of valid and invalid:
   ```csv
   firstName,lastName,dateOfBirth,gender,weight,beltRank
   John,Doe,2005-03-15,male,75.5,white
   Jane,Smith,2006-07-22,invalid,62.3,yellow
   Michael,Johnson,2004-11-08,male,82.0,orange
   ```
2. Upload the file

**Expected Result:**
- Success message: "Successfully imported 2 participant(s)"
- Error message: "Row 3 (Jane Smith): Invalid gender..."
- Error count: 1
- Participants John and Michael imported
- Jane not imported

---

### Test 11: Column Name Variations

**Steps:**
1. Create CSV with alternative column names:
   ```csv
   First Name,Last Name,Date of Birth,Gender,Weight,Belt Rank
   John,Doe,2005-03-15,male,75.5,white
   ```
2. Upload the file

**Expected Result:**
- Successfully imported 1 participant
- John Doe appears in the list

---

### Test 12: Case Insensitivity for Belt Rank

**Steps:**
1. Create CSV with different case for belt rank:
   ```csv
   firstName,lastName,dateOfBirth,gender,weight,beltRank
   John,Doe,2005-03-15,male,75.5,WHITE
   Jane,Smith,2006-07-22,female,62.3,YELLOW
   ```
2. Upload the file

**Expected Result:**
- Successfully imported 2 participants
- Both are matched correctly despite case differences

---

### Test 13: No File Selected

**Steps:**
1. Go to batch upload form
2. Click "Upload and Import Participants" without selecting file

**Expected Result:**
- Browser validation prevents submission
- Alert or message asks to select file

---

### Test 14: Large File (Performance)

**Steps:**
1. Create CSV with 100+ participants
2. Upload the file

**Expected Result:**
- File uploads successfully
- All valid participants are imported
- Process completes in reasonable time (< 30 seconds)
- Server handles gracefully

---

### Test 15: Auto-Category Assignment

**Steps:**
1. Upload valid participants with various ages, weights, belts, genders
2. Check the participants in the list
3. Verify category assignments

**Expected Result:**
- Participants show "Assigned" in Category column
- Categories are correctly assigned based on:
  - Age (date of birth)
  - Weight
  - Belt rank
  - Gender

---

## Database Verification

### After successful import, verify in MongoDB:

```javascript
// Check participants were created
db.participants.find({ tournament: ObjectId("..."), club: ObjectId("...") })

// Check club has participants
db.clubs.findOne({ _id: ObjectId("...") }).participants.length

// Check category assignments
db.participants.find({ category: { $exists: true, $ne: null } })
```

---

## UI/UX Testing

- [ ] Drag & drop area highlights on hover
- [ ] File selection feedback displays correctly
- [ ] Form prevents submission without file
- [ ] Success/error messages are clear and readable
- [ ] Flash messages persist after redirect
- [ ] Back button works correctly
- [ ] Mobile view is responsive

---

## Edge Cases to Test

1. **Empty CSV** - Only headers, no data rows
2. **Very long names** - 100+ character first/last names
3. **Special characters** - Names with ł, ż, ó, etc. (Polish characters)
4. **Duplicate entries** - Same person imported twice
5. **Very old/future dates** - 1900 or 2100 as birth year
6. **Decimal weights** - 75.5, 62.3, etc.
7. **Large weight values** - 150+ kg
8. **Small weight values** - 25 kg
9. **Unicode/emoji in names** - Should handle gracefully
10. **Windows vs Unix line endings** - CSV created on different OS

---

## Success Criteria

✅ All valid participants are imported
✅ Invalid rows show specific error messages with line numbers
✅ Participants auto-assign to categories
✅ Club participant list updates correctly
✅ No duplicate entries created
✅ Uploaded file is deleted from server
✅ Flash messages display correctly
✅ User can navigate back easily
✅ Multiple uploads work without issues
✅ Edge cases handled gracefully

---

## Troubleshooting During Testing

**Participants not showing in list after import:**
- Check browser cache (refresh)
- Verify MongoDB connection
- Check club._id includes new participant._id

**Belt rank not recognized:**
- Verify belt rank exists in database
- Check spelling (case-insensitive but exact spelling)
- Get available ranks via `/api/belt-ranks` endpoint

**File not uploading:**
- Verify multer temp directory exists
- Check file size < 5MB
- Ensure file is valid CSV format
- Check file read permissions

**Category assignment not working:**
- Verify `assignParticipantToCategory` function exists
- Check tournament has categories defined
- Verify belt rank is populated

---

## Performance Benchmarks

- Single participant import: ~100-200ms
- 10 participants: ~1-2 seconds
- 50 participants: ~5-10 seconds
- 100 participants: ~10-20 seconds
- 500 participants: ~1-2 minutes

*Times may vary based on system specs and database performance*
