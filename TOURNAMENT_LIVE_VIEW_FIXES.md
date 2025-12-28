# Tournament Live View Fixes - Documentation

## Overview
This document describes the fixes applied to the tournament live view to address:
1. Winner advancement not appearing in next phase
2. Live update issues 
3. Visual winner paths not showing
4. Match timeline ordering

## Changes Made

### 1. Enhanced JavaScript (`views/admin/tournament-live.ejs`)

#### Winner Path Visualization
Added `drawWinnerPaths()` function that:
- Finds all bracket wrappers and their SVG containers
- Iterates through each round pair (Round N to Round N+1)
- For each winner, draws a curved SVG path from their match to the next round
- Uses green dashed lines (color: #10b981) to show winner progression
- Calls this function on page load and after each page reload

**Key Features:**
- Curved paths using quadratic Bézier curves for smooth connections
- Semi-transparent lines (opacity: 0.6) for subtle visual effect
- Dynamic positioning based on element bounding rectangles
- Handles all tournament bracket structures

```javascript
const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
const midX = (x1 + x2) / 2;
const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
path.setAttribute('stroke', '#10b981');
path.setAttribute('stroke-dasharray', '5,5');
```

#### Improved Auto-Refresh Logic
Changed from hard reload every 30 seconds to:
- Fetch page content every 20 seconds (more frequent)
- Only reload if changes detected (content includes 'winner-live' class changes)
- Reduces unnecessary full page reloads
- Prevents flickering when no updates exist

```javascript
let autoRefreshInterval = setInterval(() => {
  fetch(window.location.href, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
    .then(r => r.text())
    .then(html => {
      if (html.includes('winner-live')) {
        location.reload();
      }
    })
}, 20000);
```

### 2. CSS Styling (`public/stylesheets/bracketLive.css`)

#### SVG Container Setup
```css
.winner-paths-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}
```
- Positioned absolutely to overlay the bracket
- `pointer-events: none` prevents interference with interactive elements
- SVG stays behind match boxes (z-index: 1)

#### Match Box Styling
- **Normal state**: White background, gray border
- **Active match**: Yellow background (#fef3c7), thicker border
- **Completed match**: Light green background (#f0fdf4), green border
- **Winner highlight**: Green background (#ecfdf5), bold text, color (#047857)

#### Visual Hierarchy
- Rounded corners and shadow effects
- Smooth transitions on hover
- Clear status indicators (pending, in-progress, finished)
- Responsive design for mobile devices

### 3. View Layer Updates (`views/admin/tournament-live.ejs`)

#### Bracket Structure
```html
<div class="bracket-wrapper-live">
  <svg class="winner-paths-svg"></svg>
  
  <div class="rounds-container">
    <% category.rounds.forEach(round => { %>
      <div class="round-live" data-round="<%= round.number %>">
        <!-- Match boxes here -->
      </div>
    <% }) %>
  </div>
</div>
```

- SVG canvas positioned absolutely for winner paths
- Rounds container holds all match boxes
- Each match box has data attributes for tracking

#### Match Box Data Attributes
```html
<div class="match-box-live <%= match.status %>" 
     data-match-id="<%= match._id %>" 
     data-round="<%= round.number %>" 
     data-position="<%= idx %>">
```

Used for:
- CSS class application based on status
- JavaScript selection and manipulation
- Position tracking for winner advancement logic

### 4. HTML/Stylesheet Integration (`views/layouts/boilerplate.ejs`)

Added new stylesheet link:
```html
<link rel="stylesheet" href="/stylesheets/bracketLive.css">
```

Stylesheet order (important for cascade):
1. Bootstrap
2. Font Awesome
3. main.css (base styles)
4. bracketStyle.css (general bracket styles)
5. **bracketLive.css** (NEW - live view specific)
6. liveViewStyle.css (timeline and controls)

## Backend Verification

### Winner Advancement Logic (`controllers/tournamentManagementController.js`)

The `advanceWinner()` function correctly:
1. Parses the current round number
2. Calculates the next round position
3. Queries for all matches in current and next rounds
4. Determines target match position: `Math.floor(matchPosition / 2)`
5. Fills participant slot based on parity:
   - Even positions (0, 2, 4...) → participant1
   - Odd positions (1, 3, 5...) → participant2

**Flow:**
```
Match 0 winner → Next Round Match 0, Participant1
Match 1 winner → Next Round Match 0, Participant2
Match 2 winner → Next Round Match 1, Participant1
Match 3 winner → Next Round Match 1, Participant2
```

### Data Population (`getLiveTournament`)

Ensures proper data loading:
```javascript
const categories = await Category.find({ tournament: tournamentId })
  .populate('participants')
  .populate({
    path: 'matches',
    populate: {
      path: 'participant1 participant2 winner',
      populate: {
        path: 'beltRank club'
      }
    }
  });
```

This populates:
- All participant info (name, belt rank, club)
- Winner reference with full details
- Belt rank colors for visual identification

## How Winner Paths Display

### Step-by-Step Process:

1. **Page Load** → `drawWinnerPaths()` called
2. **Find SVG container** → Locate `.winner-paths-svg` in bracket wrapper
3. **Get all rounds** → Query DOM for `.round-live` elements
4. **For each round pair**:
   - Get current round matches
   - Get next round matches
   - For each match with a winner (has `.winner-live` class):
     - Calculate source position (right edge of match box)
     - Calculate target position (left edge of corresponding next match)
     - Draw curved path connecting them
5. **Visualization** → Green dashed lines show winner progression

### Example Bracket:

```
Round 1          Round 2          Finals
┌─────────┐                      
│ Winner1 ├──────────┐           
└─────────┘          ├──────────┬──────────┐
┌─────────┐          │          │ Winner  │
│ Winner2 ├──────────┤          │ Final   │
└─────────┘          │          │         │
                    ┌┴──────────┤         │
                    │           │         │
┌─────────┐        ┌┴──────────┐│         │
│ Winner3 ├────────┤          │||         │
└─────────┘         │         │||         │
┌─────────┐        ┌┴──────────┤└─────────┘
│ Winner4 ├────────┘          │
└─────────┘                    └──────────┘
```

Green curved lines connect winners through the bracket.

## Testing

### Manual Testing Steps:

1. **Create Tournament** → Set up with single elimination
2. **Add Participants** → Assign to categories
3. **Generate Bracket** → System creates matches
4. **Start Match** → Mark as in_progress
5. **Enter Score & Winner** → Submit result
6. **Verify Advancement**:
   - Check next round to see winner appears
   - Visual green line should show in bracket
   - Winner name should display in next match
   - Winner row should have green highlight

### Automated Testing:

Run the test script:
```bash
node test_winner_advancement.js
```

This will:
- Query all tournaments
- Check each match and its winner
- Verify winner appears in next round
- Report advancement status with ✓ or ✗

## Troubleshooting

### Winners Not Appearing in Next Phase

**Possible Causes:**
1. **Match status not 'completed'** → Check if status was properly saved
2. **Round string format mismatch** → Ensure consistent round numbering
3. **Database connection issue** → Verify MongoDB is running
4. **Browser cache** → Force refresh with Ctrl+Shift+R

**Debug Steps:**
1. Check browser console for errors
2. Check server logs for exception messages
3. Run `test_winner_advancement.js` to verify DB state
4. Check Match collection in MongoDB directly

### Paths Not Displaying

**Possible Causes:**
1. **SVG not in DOM** → Verify `<svg class="winner-paths-svg"></svg>` exists
2. **Function not called** → Check if `drawWinnerPaths()` is invoked
3. **CSS conflict** → Check for overlapping styles
4. **No winners yet** → Need completed matches with winners

**Debug Steps:**
1. Open DevTools → Elements tab
2. Find `.bracket-wrapper-live` element
3. Verify `<svg class="winner-paths-svg">` child exists
4. Check if paths are rendered inside SVG
5. Verify match boxes have `.winner-live` class

### Live Updates Not Working

**Possible Causes:**
1. **Auto-refresh disabled** → JavaScript may have errors
2. **CORS issue** → Check fetch headers
3. **Server not responding** → Check if app is running

**Debug Steps:**
1. Open browser console
2. Check for JavaScript errors
3. Monitor Network tab during updates
4. Verify server is responding to requests

## Performance Considerations

### SVG Path Drawing
- Function runs on every page load/refresh
- Calculates positions dynamically based on DOM
- Only draws for matches with winners
- Scales well for tournaments with many matches

### Auto-Refresh
- Lighter fetch check (20 seconds) before full reload
- Prevents unnecessary DOM re-renders
- Check only for 'winner-live' class changes
- Can be adjusted if system is overloaded

## Future Enhancements

1. **WebSocket Updates** → Real-time updates without polling
2. **Smooth Animations** → Fade in winner lines when matches complete
3. **Mobile Optimization** → Horizontal scrolling for mobile brackets
4. **Sound Notifications** → Alert when match results are entered
5. **Statistics Display** → Show match history and stats next to bracket
6. **Export Features** → Generate bracket PDFs or images

## References

- SVG Path Documentation: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
- Bracket Tournament Logic: Single elimination seeding and advancement
- Express/EJS Server-side Rendering
- MongoDB Aggregation for match grouping
