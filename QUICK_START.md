# ⚡ CSV Batch Upload - Quick Start (5 Minutes)

## What You're Getting
A feature to import multiple tournament participants at once from a CSV file instead of adding them one-by-one.

## Installation ✅ (Already Done!)
```bash
npm install csv-parser multer
```

## Access the Feature
1. Go to Tournament → Club
2. Click on participants list
3. Click **"Batch Upload (CSV)"** button (green button next to blue "Register New Participant")

## CSV Format (Copy & Paste Template)
```csv
firstName,lastName,dateOfBirth,gender,weight,beltRank
John,Doe,2005-03-15,male,75.5,white
Jane,Smith,2006-07-22,female,62.3,yellow
Michael,Johnson,2004-11-08,male,82.0,orange
```

## The 5-Minute Process

### Step 1: Get Your CSV File
- **Option A:** Download template from upload form
- **Option B:** Use the template above
- **Option C:** Use Excel/Google Sheets and export as CSV

### Step 2: Fill With Your Data
Open in any spreadsheet app:
- **Column 1:** First name
- **Column 2:** Last name  
- **Column 3:** Birth date (YYYY-MM-DD)
- **Column 4:** Gender (male/female)
- **Column 5:** Weight in kg (can be decimal like 75.5)
- **Column 6:** Belt rank (white, yellow, orange, green, blue, brown, black)

### Step 3: Save the File
- File → Save As → Format: CSV (.csv)
- Example: `my_participants.csv`

### Step 4: Upload
- Drag file into upload area, OR
- Click to browse and select file
- Click "Upload and Import Participants"

### Step 5: Done!
- See success message with import count
- Participants appear in list
- Auto-assigned to categories ✨

## Column Names (Flexible!)
Any of these work:
- firstName = First Name = first_name
- lastName = Last Name = last_name
- dateOfBirth = Date of Birth = date_of_birth
- beltRank = Belt Rank = belt_rank

## Common Mistakes ❌

```
❌ Date as 03/15/2005  →  ✅ Use 2005-03-15 (YYYY-MM-DD)
❌ Gender as "M"       →  ✅ Use "male" or "female"
❌ Belt as "1st dan"   →  ✅ Use actual rank name like "brown"
❌ Weight as -75       →  ✅ Use positive number like 75
```

## File Requirements
- Format: `.csv` (CSV file)
- Size: Max 5MB
- Encoding: UTF-8 (default in most apps)

## Error Handling
If some rows fail:
- Successful rows still import ✅
- Error rows are reported with reasons
- Try again after fixing the errors

## Examples

### Minimal Valid CSV
```csv
firstName,lastName,dateOfBirth,gender,weight,beltRank
John,Doe,2005-03-15,male,75,white
```

### Full Example with Multiple Participants
```csv
firstName,lastName,dateOfBirth,gender,weight,beltRank
John,Doe,2005-03-15,male,75.5,white
Jane,Smith,2006-07-22,female,62.3,yellow
Michael,Johnson,2004-11-08,male,82.0,orange
Emily,Williams,2007-01-30,female,58.5,green
David,Brown,2003-05-12,male,88.5,blue
Lisa,Garcia,2005-09-18,female,70.0,orange
```

### With Polish Names (Special Characters OK)
```csv
firstName,lastName,dateOfBirth,gender,weight,beltRank
Piotr,Kowalski,2005-03-15,male,75.5,white
Maria,Zielewska,2006-07-22,female,62.3,yellow
Krzysztof,Dąbrowski,2004-11-08,male,82.0,orange
```

## What Happens Next?

After successful import:
1. ✅ Participants registered in system
2. ✅ Added to club's participant list
3. ✅ Auto-assigned to matching categories
4. ✅ Ready for tournament brackets

## Bell Ranks Available
The upload form shows all available belt ranks for your system.
Common ones: white, yellow, orange, green, blue, brown, black

## Belt Rank Not Listed?
Ask your admin to add it to the system or check the spelling.

## 🎉 That's It!

You now know how to:
- Prepare a CSV file
- Upload participants
- Handle errors
- Complete the process

## Need More Help?

- **Quick reference:** See `CSV_QUICK_REFERENCE.md`
- **Full guide:** See `CSV_BATCH_UPLOAD_GUIDE.md`
- **Troubleshooting:** See section below

## Troubleshooting

**Q: "Unknown belt rank" error**
A: Check spelling. Use belt ranks from the list on the form.

**Q: "Invalid date" error**
A: Date must be YYYY-MM-DD (e.g., March 15, 2005 = 2005-03-15)

**Q: "Invalid gender" error**
A: Must be exactly 'male' or 'female' (lowercase)

**Q: "Invalid weight" error**
A: Must be a positive number (can be decimal like 75.5)

**Q: "Missing first name or last name"**
A: Both firstName and lastName must have values

**Q: File won't upload**
A: Make sure it's a .csv file, not .xlsx or .xls

**Q: Participants not showing after import**
A: Refresh the page. Check if they're in the participants list.

---

**Ready to import?** Start with step 1 above! 🚀
