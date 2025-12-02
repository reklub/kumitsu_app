# ⚡ BATCH UPLOAD - NAVIGATION QUICK GUIDE

## 3-Step Navigation (This is What You Asked For!)

### **Step 1: Tournaments Menu**
```
Click: Tournaments
↓
You see: List of all tournaments
```

### **Step 2: Select Tournament & Club**
```
Click: Any tournament name
↓
You see: Tournament details with "Participating Clubs" section
↓
Click: "Manage" link next to your club name
↓
URL now shows: /tournaments/{id}/club/{id}
```

### **Step 3: Click Green Button!**
```
Page displays: Participants list table
↓
Buttons at bottom:
  • Blue: "Register New Participant"
  • GREEN: "Batch Upload (CSV)" ← THIS ONE
  • Gray: "Back to Tournament"
↓
Click: Green "Batch Upload (CSV)" button
↓
You're now in: CSV upload form
```

---

## Why You Couldn't See It Before

❌ **Wrong Navigation:**
- Clicking "Manage" in admin menu
- Going through tournament management
- These don't show participants page with the button

✅ **Correct Navigation:**
- Tournaments → Click tournament name
- Click "Manage" on the club (in the participating clubs list)
- Now you see the participants page with the green button

---

## Visual Flow

```
┌─ Main Page ─────────────────────────────┐
│  [Tournaments] [Other Menu Items]       │
└────────┬────────────────────────────────┘
         │ Click "Tournaments"
         ▼
┌─ Tournaments List ──────────────────────┐
│ • Tournament A                          │
│ • Tournament B                          │
│ • Tournament C                          │
└────────┬────────────────────────────────┘
         │ Click tournament name
         ▼
┌─ Tournament Details ────────────────────┐
│ Tournament Name                         │
│ Details, dates, location...             │
│                                         │
│ Participating Clubs:                    │
│ • Your Club      [Manage]  ← Click!    │
│ • Another Club   [Manage]               │
└────────┬────────────────────────────────┘
         │ Click "Manage" on your club
         ▼
┌─ PARTICIPANTS PAGE (What you wanted!) ──┐
│ [Club Name] Participants                │
│ Tournament: [Tournament Name]            │
│                                         │
│ [Participants Table]                    │
│ Name | Gender | Age | Weight | ...     │
│                                         │
│ [ Register New ] [ BATCH UPLOAD (CSV) ] │ ← HERE!
│ [ Back to Tournament ]                  │
└─────────────────────────────────────────┘
         │ Click green "BATCH UPLOAD (CSV)"
         ▼
┌─ CSV UPLOAD FORM ──────────────────────┐
│ Batch Upload Participants               │
│                                         │
│ [Instructions & examples]               │
│ [Download Template] button              │
│                                         │
│ [Drag & Drop Area]                      │
│    or click to browse                   │
│                                         │
│ [ Upload and Import Participants ]      │
│ [ Back to Participants ]                │
└─────────────────────────────────────────┘
         │ Upload CSV file
         ▼
SUCCESS! Participants imported!
```

---

## The Button You're Looking For

When you're on the **Participants Page**, the buttons look like this:

```
┌──────────────────────────────────────────────────────┐
│  ┌─────────────────────┐ ┌──────────────────────┐   │
│  │  Register New       │ │  Batch Upload (CSV)  │   │
│  │  Participant        │ │  ← THE GREEN BUTTON! │   │
│  │  (Blue Button)      │ └──────────────────────┘   │
│  └─────────────────────┘ ┌──────────────────────┐   │
│                          │  Back to Tournament  │   │
│                          │  (Gray Button)       │   │
│                          └──────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## One More Time - The Path:

```
Home 
  ↓
Tournaments 
  ↓
Click tournament 
  ↓
Click "Manage" on your club 
  ↓
Participants List Page appears
  ↓
Click GREEN "Batch Upload (CSV)" button
  ↓
CSV Upload Form
  ↓
Upload your CSV file
  ↓
Done! ✅
```

---

## Key Points

✅ You must access via **Tournaments menu**, not Admin menu
✅ The button appears on the **Participants list page**
✅ Look for the **GREEN button** (not the blue one)
✅ The button says **"Batch Upload (CSV)"**

---

## If You Still Can't Find It

1. Check the URL bar
   - Should be: `localhost:5000/tournaments/[id]/club/[id]`
   - Should show singular "club" not "clubs"

2. Refresh the page
   - Press Ctrl+R or Cmd+R

3. Check you're logged in
   - If not logged in, some buttons may be hidden

4. Clear browser cache
   - Press Ctrl+Shift+Delete
   - Clear cache and cookies
   - Refresh page

---

That's it! You should now be able to find and click the batch upload button! 🎉
