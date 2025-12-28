# 🧪 QUICK TEST CHECKLIST - Tournament Bracket System

## 📋 Pre-Flight Checklist

- [ ] MongoDB running (`mongod`)
- [ ] App running (`node app.js` on port 5000)
- [ ] Logged in as admin
- [ ] Tournament created with:
  - [ ] Categories defined
  - [ ] Participants assigned
  - [ ] Brackets generated
  - [ ] At least 8 participants in one category

## 🎯 Test 1: Basic Winner Advancement

**Goal**: Verify winner moves to next round

### Steps
1. Go to: `http://localhost:5000/admin/tournaments/{id}/live`
2. Open DevTools: Press `F12` → Console tab
3. Find "Mecze w Kolejności" section → "In Progress" match
4. Select winner from dropdown
5. Click "✓ KONIEC" button

### Expected Results
- [ ] Console shows: `[finishMatch] Submitting match...`
- [ ] Console shows: `[advanceWinner] Found 4-8 matches in current round` (NOT 20!)
- [ ] Console shows: `[advanceWinner] ✓ Winner advanced to next round`
- [ ] Page reloads automatically
- [ ] Winner's name appears in next round in green
- [ ] Bracket status shows "✓ Zakończony"

### Pass/Fail
- **PASS** if: Winner appears in next round with green highlight + success in console
- **FAIL** if: Winner doesn't appear OR shows "Found 20 matches" OR "already filled" error

---

## 🎯 Test 2: Visual Bracket Display

**Goal**: Verify bracket looks professional and shows progression paths

### Steps
1. Scroll down to "Drabinka" section
2. Look at bracket visualization

### Expected Results
- [ ] Bracket displays horizontally with multiple columns
- [ ] Each column is a round (Round 1, Semifinals, Finals)
- [ ] Matches show participant names and scores
- [ ] Winner has green highlight/background
- [ ] Green arrow line connects winner to next match
- [ ] Status badge shows match state (✓ Zakończony / ▶ Trwa / ⏱️ Zaplanowany)

### Visual Quality Checks
- [ ] Text is readable (not too small/large)
- [ ] Colors are professional (purple gradients, green highlights)
- [ ] Layout is organized (not cluttered)
- [ ] Spacing is good (not cramped)

### Pass/Fail
- **PASS** if: Bracket looks professional, clear progression visible
- **FAIL** if: Illegible text, no lines, poor layout, confusing colors

---

## 🎯 Test 3: Multiple Match Completion

**Goal**: Verify multiple winners can advance in sequence

### Steps
1. Complete 2-3 matches in Round 1 (different ones)
2. Watch console logs after each
3. Check bracket to see multiple winners in Round 2

### Expected Results
- [ ] Each match advances its winner correctly
- [ ] Console shows correct match counts each time
- [ ] All winners appear in next round
- [ ] Green arrow lines for each winner
- [ ] No conflicts or overwriting

### Pass/Fail
- **PASS** if: All winners appear correctly in next round
- **FAIL** if: Winners overwrite each other OR only last one shows

---

## 🎯 Test 4: Full Tournament Progression

**Goal**: Verify entire tournament can complete successfully

### Steps
1. Complete all Round 1 matches (should be 4-8 winners)
2. Complete all Round 2 matches (should be 2-4 winners)
3. Complete final match
4. Check that there's a champion

### Expected Results
- [ ] Round 1: 4-8 winners advance to Round 2
- [ ] Round 2: 2-4 winners advance to Finals
- [ ] Finals: 1 winner (champion)
- [ ] No errors at any stage
- [ ] All data persists

### Pass/Fail
- **PASS** if: Tournament completes with clear champion
- **FAIL** if: Errors, missing winners, or data loss

---

## 🎯 Test 5: Page Refresh Persistence

**Goal**: Verify data isn't lost on page refresh

### Steps
1. Complete a match
2. See winner in next round
3. Press F5 (refresh page)
4. Check bracket again

### Expected Results
- [ ] Winner still visible in next round after refresh
- [ ] No data lost
- [ ] Bracket looks the same

### Pass/Fail
- **PASS** if: Data persists after refresh
- **FAIL** if: Winner disappears or data reverts

---

## 🎯 Test 6: Console Logging Accuracy

**Goal**: Verify console logs match actual behavior

### Steps
1. Complete a match
2. Check console logs match this pattern:

```
[finishMatch] Submitting match...
[updateMatchResult] Match found: round 1
[updateMatchResult] Calling advanceWinner...
[advanceWinner] Starting for match...
[advanceWinner] Found category: [ID]
[advanceWinner] Current round: 1
[advanceWinner] Found X matches in current round (X should be 4-8)
[advanceWinner] Match position: Y out of Z
[advanceWinner] Found X matches in next round
[advanceWinner] Target match: [ID], position: Y
[advanceWinner] Will place winner in participant1/participant2
[advanceWinner] ✓ Winner advanced to next round match
```

### Expected Results
- [ ] All logs appear
- [ ] Match count is 4-8 (not 20)
- [ ] Position calculations look reasonable
- [ ] Final message shows success

### Pass/Fail
- **PASS** if: Logs match expected pattern
- **FAIL** if: Missing logs, wrong counts, or errors

---

## 🎯 Test 7: Auto-Refresh Functionality

**Goal**: Verify bracket updates when other admin makes changes

### Steps
1. Open tournament in 2 browser tabs (admin accounts)
2. In Tab 1: Complete a match, watch for green highlight
3. In Tab 2: Wait 15 seconds
4. Check if Tab 2 updates to show Tab 1's match result

### Expected Results
- [ ] Tab 2 auto-reloads after ~15 seconds
- [ ] Tab 2 shows updated bracket from Tab 1
- [ ] No manual refresh needed

### Pass/Fail
- **PASS** if: Auto-refresh works across tabs
- **FAIL** if: No auto-refresh or doesn't update

---

## 🎯 Test 8: Error Handling

**Goal**: Verify system handles edge cases gracefully

### Steps
1. Try to finish a match without selecting a winner
   - [ ] Should show error: "Proszę wybrać zwycięzcę meczu"

2. Try to finish final match (only 2 players left)
   - [ ] Should complete successfully
   - [ ] No "next round" error

3. Finish a match, then immediately close page
   - [ ] Backend should still process
   - [ ] Reopen page, winner should be there

### Pass/Fail
- **PASS** if: All error cases handled gracefully
- **FAIL** if: Crashes, confusing messages, or data loss

---

## 📊 Summary Scorecard

Fill in results:

| Test | Result | Pass/Fail | Notes |
|------|--------|-----------|-------|
| Basic Winner Advancement | | ✅/❌ | |
| Visual Bracket Display | | ✅/❌ | |
| Multiple Match Completion | | ✅/❌ | |
| Full Tournament Progression | | ✅/❌ | |
| Page Refresh Persistence | | ✅/❌ | |
| Console Logging Accuracy | | ✅/❌ | |
| Auto-Refresh Functionality | | ✅/❌ | |
| Error Handling | | ✅/❌ | |

**Overall Status**: 
- If 8/8 ✅ = **COMPLETE** ✅
- If 6-7/8 ✅ = **MOSTLY WORKING** ⚠️
- If <6/8 ✅ = **NEEDS FIXES** ❌

---

## 🐛 If Tests Fail

### Issue: "Found 20 matches" (wrong count)
- **Cause**: Category lookup failed
- **Fix**: Check if Category.matches array is populated
- **Debug**: Run `node test_bracket_flow.js`

### Issue: "already filled" error
- **Cause**: Winner placed in wrong slot
- **Fix**: Check position calculation in logs
- **Debug**: Look for "Match position: X out of Y" in console

### Issue: No green lines visible
- **Cause**: SVG drawing function didn't run
- **Fix**: Reload page (F5) to trigger draw
- **Debug**: Check for `[drawBracketLines]` in console

### Issue: Winner doesn't persist
- **Cause**: Page reloaded before backend saved
- **Fix**: Check that advanceWinner showed success
- **Debug**: Look for "✓ Winner advanced" in console

---

## ✅ Final Verification

After all tests pass:

- [ ] Backend winner advancement works correctly
- [ ] Visual bracket is professional and clear
- [ ] Green lines show progression paths
- [ ] Multiple matches can complete
- [ ] Data persists across refreshes
- [ ] Auto-refresh works
- [ ] Error handling is graceful
- [ ] Console logs are helpful for debugging

**If all checks pass → System is ready for production! 🚀**

---

## 💬 Testing Notes

**Environment**:
- OS: Windows
- Browser: Chrome/Firefox/Edge
- MongoDB: Local instance
- Node.js: v14+

**Test Data**:
- Tournament name: ________________
- Categories: ________________
- Participants per category: ________________
- Test date: ________________

**Tester**: ________________

---

**Test Complete!** Submit results and any issues found.
