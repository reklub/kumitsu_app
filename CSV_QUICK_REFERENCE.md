# 🎯 CSV Batch Upload - Quick Reference

## Access the Feature
1. Go to a Tournament
2. Select a Club
3. Click **"Batch Upload (CSV)"** button next to "Register New Participant"

## CSV Format Required

```csv
firstName,lastName,dateOfBirth,gender,weight,beltRank
John,Doe,2005-03-15,male,75.5,white
Jane,Smith,2006-07-22,female,62.3,yellow
```

### Column Requirements:
| Field | Format | Example |
|-------|--------|---------|
| firstName | Text | John |
| lastName | Text | Doe |
| dateOfBirth | YYYY-MM-DD | 2005-03-15 |
| gender | male/female | male |
| weight | Decimal (kg) | 75.5 |
| beltRank | Belt name | white, yellow, orange, green, blue, brown, black |

## Steps to Import

1. **Download Template** - Get sample CSV from upload page
2. **Open in Excel/Sheets** - Use any spreadsheet app or text editor
3. **Add Your Data** - Fill in participant rows
4. **Save as CSV** - Export/save as .csv file
5. **Upload** - Drag & drop or browse to select file
6. **Review** - Check success/error messages

## Quick Tips

✅ **Column names are flexible:**
- "firstName" = "First Name" = "first_name"
- "lastName" = "Last Name" = "last_name"
- "dateOfBirth" = "Date of Birth" = "date_of_birth"
- "beltRank" = "Belt Rank" = "belt_rank"

✅ **What happens after upload:**
- ✓ Participants created
- ✓ Added to club's participant list
- ✓ Automatically assigned to categories
- ✓ Ready for tournaments

❌ **Common mistakes:**
- Date format: Use YYYY-MM-DD (not MM/DD/YY)
- Gender: Use 'male' or 'female' (lowercase)
- Weight: Use positive numbers (75.5 is OK)
- Belt rank: Check spelling and availability

## File Specifications

- **Format:** CSV (.csv) only
- **Max Size:** 5MB
- **Encoding:** UTF-8 recommended
- **Rows:** Unlimited (tested with 100+ participants)

## Batch Processing

- **One failed row won't stop others** - If row 5 fails, rows 1-4 and 6+ still import
- **Error messages are specific** - Shows exactly which row and why it failed
- **No rollback** - Successful imports are saved even if some fail
- **Automatic cleanup** - Uploaded file deleted after processing

## Sample Workflow

**Scenario:** Import 50 players from your club to a tournament

1. Coach opens tournament page → Club page
2. Clicks "Batch Upload (CSV)"
3. Downloads template.csv
4. Opens in Excel
5. Adds 50 participants (copy/paste from club database)
6. Saves file
7. Uploads file
8. Gets message: "Successfully imported 50 participant(s)"
9. All 50 players automatically assigned to categories
10. Done! 🎉

## Troubleshooting

**Q: "Invalid belt rank" error**
- A: Check belt rank spelling. Ask admin for list of valid ranks.

**Q: "Missing first name or last name"**
- A: Check row has both firstName and lastName columns with values.

**Q: "Invalid date" error**
- A: Use format YYYY-MM-DD (e.g., 2005-03-15 for March 15, 2005).

**Q: "Invalid gender" error**
- A: Use 'male' or 'female' in lowercase.

**Q: File won't upload**
- A: Make sure it's a .csv file, not .xlsx or .xls.

## API Info (For Developers)

**Upload Endpoint:**
```
POST /tournaments/:tournamentId/clubs/:clubId/batch-upload
Requires: authMiddleware
Format: multipart/form-data
Field: csvFile
```

**Get Belt Ranks:**
```
GET /api/belt-ranks
Returns: JSON array of belt rank objects
```

---
For detailed guide: See `CSV_BATCH_UPLOAD_GUIDE.md`
