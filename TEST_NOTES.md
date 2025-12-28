# Tournament Bracket Live View - Testing Notes

## Current Status: CRITICAL FIX APPLIED ✅

### Issue Fixed
The winner advancement system was broken due to a data model mismatch:
- **Root Cause**: Match documents don't have a `category` field, but the query was using `{tournament, category, round}` where `category` was `undefined`
- **Impact**: Query ignored category filter and returned all 20 tournament matches instead of 4-8 category-specific matches
- **Result**: Wrong match position calculated, winner placed in wrong slot or skipped due to "already filled"

### Solution Applied
In `controllers/tournamentManagementController.js`, the `advanceWinner()` function now:

```javascript
// Find category via reverse lookup (Category has matches array)
const category = await Category.findOne({ matches: match._id });

// Query only matches in that category's matches array
const currentRoundMatches = await Match.find({
  _id: { $in: category.matches },
  round: { $in: [currentRound.toString(), currentRound] }
});

// Same approach for next round
const nextRoundMatches = await Match.find({
  _id: { $in: category.matches },
  round: { $in: [nextRound.toString(), nextRound] }
});
```

## How to Test

### 1. Start MongoDB
```powershell
mongod
```

### 2. Start the Application
```powershell
cd d:\wypociny\kumitsu_app\kumitsu_app
node app.js
```

### 3. Open Browser Console
- Go to `http://localhost:5000`
- Press `F12` to open Developer Console
- Go to "Console" tab
- Keep it open while testing

### 4. Test Winner Advancement

**Prerequisites**: You need a tournament with matches scheduled

**Steps**:
1. Login as admin
2. Go to `/admin/tournaments/{id}/live` (tournament live view)
3. Find a match in "In Progress" section (or change a match status to "in_progress")
4. Select a winner from dropdown
5. Click "End Match" button
6. Watch browser console for these logs:

Expected console output:
```
[updateMatchResult] Match found: round 1, category: undefined
[updateMatchResult] Calling advanceWinner...
[advanceWinner] Starting for match {matchId}, round: 1, winner: {winnerId}
[advanceWinner] Found category: {categoryId}
[advanceWinner] Current round: 1
[advanceWinner] Found {count} matches in current round
[advanceWinner] Match position: {pos} out of {total}
[advanceWinner] Found {count} matches in next round
[advanceWinner] Target match: {matchId}, position: {nextPos}
[advanceWinner] Will place winner in participant1/participant2 (position {pos} is even/odd)
[advanceWinner] ✓ Winner advanced to next round match as participant1/participant2
```

### 5. Verify Results
- **In Console**: Should see match count as ~4-8 for 8-match bracket (not 20)
- **In Browser**: Page reloads and shows winner in next round (not "TBD")
- **SVG Lines**: Cyan arrows should appear from winner to target match in next round

## Debugging Checklist

✅ **Match count should be correct**
- Round 1: 4-8 matches (depending on bracket size)
- NOT 20 (that was the bug)

✅ **Winner position calculation should be correct**
- Match 0 → position 0 of 4 → goes to match 0 of 2
- Match 1 → position 1 of 4 → goes to match 0 of 2
- Match 2 → position 2 of 4 → goes to match 1 of 2
- Match 3 → position 3 of 4 → goes to match 1 of 2

✅ **Participant slot should be correct**
- Even position (0, 2, 4...) → participant1
- Odd position (1, 3, 5...) → participant2

✅ **SVG drawing should work**
- `drawWinnerPaths()` called after page load
- Gets all brackets
- For each completed match with winner, draws cyan bezier curve to next round
- Adds arrow at end

## Files Modified This Session

1. **controllers/tournamentManagementController.js** (CRITICAL)
   - Fixed `advanceWinner()` function
   - Now uses category reverse lookup
   - Lines ~520-605

2. **views/admin/tournament-live.ejs** 
   - JavaScript for bracket rendering
   - `drawWinnerPaths()` function
   - Lines ~1140-1260

3. **public/stylesheets/bracketLive.css** (Created)
   - Professional bracket styling
   - Match box styling
   - Animation and transitions

## What's NOT Fixed Yet

- Live real-time updates (still uses 20-second polling)
- Animation of winner movement (instant reload)
- Loser bracket support (only single elimination for now)

## Next Steps

1. **Test with real tournament data** - verify winner shows in next round
2. **Check SVG rendering** - ensure cyan lines appear
3. **Test full bracket progression** - take winner through multiple rounds
4. **Check edge cases** - final match, bye rounds, etc.

## Database Connection

The app connects to: `mongodb://localhost:27017/tournaments`

Make sure:
- MongoDB is running
- Database `tournaments` exists
- Collections: tournaments, users, categories, matches, participants, beltranks

## Key Code Paths

**Winner Submission**:
1. User selects winner in UI → `finishMatch()` in tournament-live.ejs
2. POST to `/tournaments/:id/matches/:matchId/result`
3. Handled by `updateMatchResult()` in tournamentManagementController.js
4. Calls `advanceWinner(match)` 
5. Winner placed in next round match
6. Page reloads (20-second polling catches it)

**SVG Drawing**:
1. Page loads → `DOMContentLoaded` event
2. Calls `drawWinnerPaths()`
3. Finds all brackets with class `.bracket-wrapper-live`
4. For each bracket, finds `.round-live` divs
5. For each match with `.winner-live` class, draws bezier path
6. Uses `getBoundingClientRect()` to get positions

## Help Needed?

If winner still doesn't advance:
- Check console for `[advanceWinner]` logs with "Found X matches in next round"
- X should be ~4-8, not 20
- If still 20, the category lookup failed
- Check if Category documents have `matches` array populated
