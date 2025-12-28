# Tournament Live View - Quick Reference Guide

## What Was Fixed

✅ **Winner Advancement** - Winners now automatically appear in the next round  
✅ **Visual Paths** - Green curved lines show winner progression through bracket  
✅ **Live Updates** - Smart refresh every 20 seconds (only reloads on changes)  
✅ **Sequential View** - All fights displayed in order by match number  

## How to Use

### 1. Starting a Tournament Live View
```
Navigate to: /admin/tournaments/:id/live
```

### 2. Understanding the Layout

**Top Section: Sequential Fights Timeline**
- Shows all matches in numerical order (Match 1, Match 2, etc.)
- Color-coded by status:
  - 🔴 **Red** = In Progress (currently being fought)
  - ⏳ **Yellow** = Scheduled (waiting to start)
  - ✓ **Green** = Completed (finished)

**Bottom Section: Category Brackets**
- Visual tournament bracket for each category
- Shows round progression (Round 1 → Round 2 → Finals)
- **Green curved lines** = Winner paths to next round
- **Green highlights** = Winner rows in each match

### 3. Managing a Match

**To Start a Match:**
1. Find the match in the timeline
2. Click "▶ START" button
3. Match moves to "In Progress" section
4. Live score input becomes available

**To Finish a Match:**
1. Enter scores for both participants
2. Select the winner from dropdown
3. Click "✓ FINISH" button
4. Match automatically advances winner to next round
5. Page refreshes to show updated bracket

### 4. Viewing Winner Advancement

**In Sequential View:**
- Completed matches show both score and winner's name
- Winner row highlighted in green background
- Winner automatically appears in next match

**In Bracket View:**
- Green dashed lines connect winners through rounds
- Winner name appears in next round's match box
- Visual path shows progression: Round 1 → Round 2 → Finals

## Key Features Explained

### Smart Live Updates
- Checks for changes every 20 seconds
- Only reloads page if winner data changed
- Prevents unnecessary flickering
- More efficient than constant page refreshes

### SVG Winner Paths
The bracket displays curved paths showing how winners advance:
- **Start point** = Right edge of winner's match
- **End point** = Next round match box
- **Curve style** = Smooth quadratic Bézier curve
- **Color** = Emerald green (#10b981)
- **Style** = Dashed line (5px dash, 5px gap)

### Match Status Indicators

| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| Pending | Red | ⏳ | Not started yet |
| In Progress | Yellow | 🔴 | Currently happening |
| Completed | Green | ✓ | Match finished |

### Participant Display
- **Name & Belt Rank** = Color-coded dot showing belt level
- **Club** = Affiliation information
- **Score** = Points/wins for that participant
- **Winner** = Shown with green background highlight

## Match Number System

Matches are numbered sequentially across the entire tournament:
```
Category 1: Matches 1-4
Category 2: Matches 5-8
etc.
```

Timeline shows all matches in this order, making it easy to:
- Find the next match to be fought
- See overall tournament progress
- Track timing and schedule

## Bracket Structure

### Single Elimination Brackets
```
Round 1          Round 2          Finals
(8 matches) →   (4 matches) →    (1 match)
```

### Winner Advancement Rules
- Winners from Round 1 go to Round 2
- Matches are paired sequentially:
  - Matches 1-2 winners → Match 1 of next round
  - Matches 3-4 winners → Match 2 of next round
  - etc.

### Position Filling
- First winner → Participant 1 slot
- Second winner → Participant 2 slot
- Pattern repeats for each pair

## Troubleshooting

### "Winner not showing in next round"
1. Verify match status is "Completed" (not just "finished")
2. Check that winner is properly selected
3. Reload page with Ctrl+Shift+R to clear cache
4. Check browser console for errors (F12)

### "Green lines not visible"
1. Scroll the bracket view horizontally
2. Lines may be outside visible area
3. Check if matches have completed status
4. Try refreshing the page

### "Page not updating"
1. Check if matches were actually started/finished
2. Verify browser JavaScript is enabled
3. Check network connection
4. Try manual refresh (F5 key)

## Keyboard Shortcuts

- **F5** = Refresh page manually
- **Ctrl+Shift+R** = Hard refresh (clear cache)
- **F12** = Open Developer Tools
- **Tab** = Navigate between score inputs

## Tips & Tricks

### Efficient Tournament Management
1. Keep Sequential View in focus for quick match selection
2. Use Bracket View to monitor overall progress
3. Sort matches by status (focus on "In Progress" first)
4. Update scores quickly to keep timeline moving

### Better Visibility
- Maximize browser window for full bracket view
- Use zoom out (Ctrl+-) if bracket is too wide
- Split screen: Timeline on left, Bracket on right
- Use fullscreen mode (F11) for presentations

### For Tournament Referees
- Display bracket on main screen
- Use timeline for match calling
- Check bracket visualization for advancement
- Winner paths confirm proper seeding

## Files Modified

- `views/admin/tournament-live.ejs` - Added SVG and enhanced JS
- `public/stylesheets/bracketLive.css` - New bracket styling
- `views/layouts/boilerplate.ejs` - Added CSS link
- Backend remains unchanged (winner advancement already working)

## Testing the System

Run the validation script:
```bash
node test_winner_advancement.js
```

This will:
- Check all tournaments in database
- Verify winners advanced to next round
- Report any issues found
- Confirm system is working correctly

## Support

If issues occur:
1. Check `TOURNAMENT_LIVE_VIEW_FIXES.md` for technical details
2. Review browser console (F12) for JavaScript errors
3. Check server logs for database issues
4. Verify MongoDB connection is active
5. Run test script to check database state

## Performance Notes

- System checks for updates every 20 seconds
- Refreshes only when winners change
- SVG paths render dynamically on each load
- Works smoothly with 100+ matches
- Optimized for all modern browsers
