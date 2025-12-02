# Batch Upload Participants - CSV Feature

## Overview
This feature allows you to import multiple participants for a club in a tournament by uploading a CSV (Comma-Separated Values) file instead of adding them one by one manually.

## How to Use

### 1. Access the Batch Upload Feature
- Navigate to a tournament's club participants page
- Click the **"Batch Upload (CSV)"** button
- You'll be taken to the CSV upload form

### 2. Prepare Your CSV File

#### Required Columns
Your CSV file must contain the following columns (in any order):

| Column Name | Type | Format | Example |
|------------|------|--------|---------|
| `firstName` | Text | Any text | John |
| `lastName` | Text | Any text | Doe |
| `dateOfBirth` | Date | YYYY-MM-DD | 2005-03-15 |
| `gender` | Text | 'male' or 'female' | male |
| `weight` | Number | Decimal (kg) | 75.5 |
| `beltRank` | Text | Valid belt rank* | white, yellow, orange, green, blue, brown, black |

*Belt ranks must match exactly with the available belt ranks in your system (case-insensitive)

#### Example CSV Content
```csv
firstName,lastName,dateOfBirth,gender,weight,beltRank
John,Doe,2005-03-15,male,75.5,white
Jane,Smith,2006-07-22,female,62.3,yellow
Michael,Johnson,2004-11-08,male,82.0,orange
Emily,Williams,2007-01-30,female,58.5,green
```

#### How to Create a CSV File
1. **Using a Spreadsheet Application (Excel, Google Sheets, LibreOffice Calc):**
   - Create a new spreadsheet
   - Add headers in the first row matching the column names above
   - Enter participant data in subsequent rows
   - Save as CSV format (.csv)

2. **Using a Text Editor (Notepad, VS Code):**
   - Create a plain text file
   - Format each line as comma-separated values
   - Save with `.csv` extension

3. **Download Template:**
   - Click the "Download CSV Template" button on the upload page
   - Open it in Excel or a text editor
   - Fill in your participant data
   - Save the file

### 3. Upload the File
- Click the upload area or drag and drop your CSV file
- The system will display the selected filename
- Click **"Upload and Import Participants"** to process

### 4. Review Results
- The system will display:
  - ✅ Number of successfully imported participants
  - ❌ Number of failed imports with specific error messages
  - Details about what went wrong (e.g., missing fields, invalid belt rank)

## Validation Rules

The system validates each row and provides specific error messages:

- **Missing Fields:** First name, last name, or date of birth cannot be empty
- **Invalid Gender:** Must be exactly 'male' or 'female'
- **Invalid Weight:** Must be a positive number
- **Invalid Belt Rank:** Must match one of the available belt ranks in your system
- **Invalid Date:** Date must be in YYYY-MM-DD format and be a valid date

## Features

✨ **Automatic Category Assignment**
- Upon successful import, participants are automatically assigned to matching categories based on:
  - Age (calculated from date of birth)
  - Belt rank
  - Weight
  - Gender

✨ **Batch Processing**
- Import dozens of participants at once
- Each participant is validated individually
- Successful imports are saved even if some rows fail

✨ **Detailed Error Reporting**
- Shows which rows failed and why
- Helps you fix the CSV and retry

✨ **Drag & Drop Support**
- Drag your CSV file directly into the browser
- Or click to browse and select files

## File Size Limits
- Maximum file size: 5MB
- Acceptable formats: CSV (.csv)

## Troubleshooting

### "Invalid belt rank" Error
- Check your belt rank spelling (case doesn't matter)
- Verify the belt rank exists in your system
- Common belt ranks: white, yellow, orange, green, blue, brown, black

### "Invalid date" Error
- Date must be in YYYY-MM-DD format
- Example: March 15, 2005 = 2005-03-15

### "Invalid gender" Error
- Use lowercase: 'male' or 'female'
- No other values are accepted

### "Invalid weight" Error
- Must be a positive number
- Can use decimals: 75.5 is valid
- Use kg (kilograms) as the unit

## API Integration

### For Developers
The batch upload feature uses:
- **Endpoint:** `POST /tournaments/:tournamentId/clubs/:clubId/batch-upload`
- **Method:** multipart/form-data
- **File Input:** `csvFile` (field name)
- **Authentication:** Required (authMiddleware)

Bell ranks can be fetched via:
- **Endpoint:** `GET /api/belt-ranks`
- **Response:** JSON array of belt rank objects

## Advanced: Column Name Alternatives

The system is flexible with column names. These alternatives are recognized:

| Preferred | Alternatives |
|-----------|--------------|
| firstName | First Name, first_name |
| lastName | Last Name, last_name |
| dateOfBirth | Date of Birth, date_of_birth |
| gender | Gender |
| weight | Weight |
| beltRank | Belt Rank, belt_rank |

## Example Workflow

1. Download the CSV template from the batch upload page
2. Open it in Excel
3. Add your participants:
   - Row 2: John, Doe, 2005-03-15, male, 75.5, white
   - Row 3: Jane, Smith, 2006-07-22, female, 62.3, yellow
4. Save the file
5. Go to the batch upload page
6. Upload your file
7. See the success message with import count
8. Participants are now in the system and automatically assigned to categories!

## Notes

- All participants are automatically assigned to appropriate categories based on their attributes
- Participants are added to the club's participant list
- Failed imports don't prevent successful ones from being saved
- The CSV file is deleted from the server after processing (for security)
