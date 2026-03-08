# F1 Fantasy League 2026 — Complete Project Reference

## Quick Start
```bash
cd /Users/Conner/Desktop/Claude/f1-fantasy
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build → dist/
```

**Live URL:** https://f1-fantasy-lyart.vercel.app
**GitHub:** connermonda-debug/f1-fantasy
**Git push:** `export PATH="$HOME/bin:$PATH" && git push origin main`
**gh CLI:** `~/bin/gh`

---

## What This Is
A React SPA that tracks a 4-person F1 fantasy league for the 2026 season. Each player drafted 5 F1 drivers. Points are calculated from real race results (qualifying, race, sprint, bonuses, penalties). Results auto-fetch via GitHub Actions, auto-deploy via Vercel.

**Tech Stack:** React 18 + Vite 6, zero external dependencies beyond React. Dark F1-themed CSS. Titillium Web font. PWA-ready.

---

## Fantasy Teams

| Player | Drivers |
|--------|---------|
| **Gray** | Norris, Hamilton, Sainz, Bottas, Bortoleto |
| **Wes** | Russell, Leclerc, Lindblad, Hulkenberg, Bearman |
| **Hayes** | Verstappen, Hadjar, Colapinto, Gasly, Ocon |
| **Conner** | Piastri, Antonelli, Albon, Lawson, Alonso |

---

## Scoring Rules

| Category | Points |
|----------|--------|
| Qualifying P1-P10 | 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 |
| Race P1-P10 | 25, 18, 15, 12, 10, 8, 6, 4, 2, 1 |
| Sprint P1-P8 | 8, 7, 6, 5, 4, 3, 2, 1 |
| Fastest Lap | +10 |
| Driver of the Day | +3 |
| DNF (race only) | -10 |
| Fastest Pit Stop | +5 (constructor bonus — team must have BOTH drivers from that constructor) |
| Driver Champion | +25 (season-end) |
| Constructor Champion | +50 (season-end) |

---

## File Structure

```
f1-fantasy/
├── .github/workflows/update-results.yml   # GitHub Actions: biweekly fetch + auto-commit
├── .claude/
│   ├── launch.json                        # Dev server config for preview
│   └── HANDOFF.md                         # THIS FILE
├── scripts/
│   └── fetch-results.mjs                  # Jolpica API + Wikipedia DOTD fetcher
├── public/
│   ├── icon-192.svg                       # PWA icon
│   ├── icon-512.svg                       # PWA icon
│   └── manifest.json                      # PWA manifest
├── src/
│   ├── components/
│   │   ├── Standings.jsx                  # Hero cards + race-by-race table
│   │   ├── RaceView.jsx                   # Detailed race breakdown + share button
│   │   ├── Stats.jsx                      # Season analytics + recaps + chart
│   │   ├── SeasonChart.jsx                # Custom SVG line chart (cumulative pts)
│   │   ├── Teams.jsx                      # Fantasy team rosters
│   │   ├── Calendar.jsx                   # 24-race schedule
│   │   └── Rules.jsx                      # Scoring reference cards
│   ├── utils/
│   │   ├── generateRecap.js              # Template-based narrative race summaries
│   │   └── generateShareCard.js          # Canvas API → 1080x1080 PNG card
│   ├── data.js                           # Constructors, drivers, teams, scoring, calendar
│   ├── results.json                      # Race results (auto-populated by fetch script)
│   ├── App.jsx                           # Main shell: tabs, toast, header
│   ├── main.jsx                          # React entry point
│   └── index.css                         # All styles (~500 lines)
├── index.html                            # Entry HTML (PWA meta, Google Fonts)
├── vite.config.js                        # Vite + React plugin + __BUILD_TIME__ injection
├── vercel.json                           # Vercel deployment config
└── package.json                          # React 18 + Vite 6 only
```

---

## Data Flow

```
Jolpica API (api.jolpi.ca/ergast/f1/2026/...)
    + Wikipedia (DOTD scraping)
         ↓
scripts/fetch-results.mjs (run by GitHub Actions)
         ↓
src/results.json (committed to repo)
         ↓
Vercel auto-deploys on push
         ↓
App.jsx → calculateStandings() → standings object
         ↓
All 6 tab components render from standings
```

---

## Key Files in Detail

### `src/results.json` — Race Data
```json
[
  {
    "round": 1,
    "qualifying": ["russell", "antonelli", ...],    // P1→P20 grid order
    "race": ["russell", "antonelli", ...],           // Classified finishers P1→Pn
    "sprint": ["driver", ...],                       // Sprint results (if sprint weekend)
    "dnfs": ["stroll", "alonso", ...],               // Did Not Finish
    "fastestLap": "verstappen",                      // Driver key
    "driverOfTheDay": "verstappen",                  // Driver key
    "fastestPitStop": "mercedes"                     // Constructor key
  }
]
```

### `src/utils.js` — Scoring Engine
- `getConstructorPairs(teamDrivers)` — finds constructor pairs in a team's driver list
- `calculateDriverRacePoints(driverKey, race)` — single driver, single race → { points, breakdown }
- `calculateTeamRacePoints(teamKey, race)` — team total for one race (drivers + constructor bonuses)
- `calculateStandings()` — full season standings, sorted by total points
- `getRaceDetails(round)` — detailed breakdown for one specific round

### `scripts/fetch-results.mjs` — Data Fetcher
- Fetches qualifying, race, sprint, pit stops from Jolpica API
- Scrapes DOTD from Wikipedia race article infobox
- **Key logic:**
  - `isClassified(status)` — recognizes "Finished", "Lapped", "+X Lap" as classified
  - 90% lap threshold — "Lapped" drivers below 90% of leader's laps → DNF
  - Grid extraction: tries race grid positions first (post-penalties), falls back to qualifying session
  - Sprint DNFs NOT added to `result.dnfs` (only race DNFs penalized)
- Driver/Constructor ID maps: converts Ergast IDs to local keys
- Compares old vs new JSON, only writes if changed

### `src/App.jsx` — Main Shell
- 6 tabs: Standings, Races, Stats, Teams, Calendar, Rules
- Toast notification: compares `RESULTS` max round vs localStorage `f1fantasy_lastSeenRound`
- Header: season progress (X/24 races), relative "Last Updated" time from `__BUILD_TIME__`
- `calculateStandings()` memoized on mount

### `src/components/RaceView.jsx` — Race Detail View
- Dropdown to select completed round (defaults to latest)
- Race header: name, circuit, location, date, sprint badge
- Bonus cards: fastest lap, DOTD, fastest pit stop, DNFs
- Team result cards sorted by points (drivers sorted within each card)
- Share button: dynamically imports `generateShareCard.js` (code-split)

### `src/components/Stats.jsx` — Analytics
- `<SeasonChart />` — cumulative points line chart
- 8 stat cards: best/worst weekend, top driver, leader gap, per-team bests
- Race recaps (newest first) via `generateRecap()`
- Stats and recaps memoized with `useMemo`

### `src/components/SeasonChart.jsx` — SVG Line Chart
- 800×320 SVG with viewBox (responsive scaling)
- One polyline per team (colored, with glow shadow)
- Hover tooltips: team name, round, cumulative pts, round delta
- Legend below chart
- Auto-scaling Y-axis with smart tick generation

### `src/components/Teams.jsx` — Team Rosters
- 4-column grid, ordered by standings position
- Drivers sorted by individual season points (highest first)
- Shows negative points (not dashes) via nullish coalescing (`?? 0`)
- Constructor pair badges when team has both drivers

### `src/utils/generateRecap.js` — Narrative Generator
- Template-based (pure JS, no AI/API)
- 5-part structure: winner headline → fantasy performance → notable events → sprint → season context
- Uses driver short codes and full names from data.js

### `src/utils/generateShareCard.js` — PNG Generator
- Canvas API: 1080×1080 dark-themed card
- F1 red stripe, race header, team result cards with driver breakdowns
- Web Share API → fallback download
- Code-split into separate chunk (~4.4KB)

---

## GitHub Actions Schedule
**File:** `.github/workflows/update-results.yml`
- Race weekends (Fri-Sun): every 2 hours
- Weekdays (Mon-Thu): once daily at 08:00 UTC
- Manual trigger available
- Auto-commits changes to `src/results.json`

---

## Common Operations

### Manually add race results
Edit `src/results.json` directly. Each round needs at minimum:
- `round` (number)
- `qualifying` (array of driver keys, P1→P20)
- `race` (array of classified finishers, P1→Pn)
- `dnfs` (array of DNF driver keys)

Optional: `fastestLap`, `driverOfTheDay` (driver keys), `fastestPitStop` (constructor key), `sprint` (array)

### Re-run the fetch script
```bash
cd /Users/Conner/Desktop/Claude/f1-fantasy
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
node scripts/fetch-results.mjs
```

### Build and deploy
```bash
npm run build                                        # Build
export PATH="$HOME/bin:$PATH" && git push origin main # Push → Vercel auto-deploys
```

### Add a new fantasy team
1. Add entry to `FANTASY_TEAMS` in `src/data.js`
2. Assign 5 drivers
3. Everything else auto-computes

### Mid-season driver swap
1. Update driver's constructor in `DRIVERS` (data.js)
2. Update constructor's `drivers` array in `CONSTRUCTORS` (data.js)
3. Update `DRIVER_MAP` in fetch script if new driver

---

## Known Limitations
- **No backend** — fully static, client-side scoring
- **DOTD is best-effort** — Wikipedia parsing can fail; may need manual entry
- **Fastest lap sometimes missing from API** — Jolpica may lag; manual fallback needed
- **Fixed 4-player league** — can't add/remove players without code changes
- **No live updates** — results sync on GitHub Actions schedule, not real-time
- **Season-end bonuses (WDC +25, WCC +50) not yet implemented** — need to add after season ends

---

## Bugs Fixed (for reference)
1. DNF scoring: was penalizing all P11+ drivers; fixed with `isClassified()` + 90% lap threshold
2. Missing qualifying: API returns `grid: null`; fixed with independent qualifying fallback
3. Negative points display: Teams tab showed "—" instead of negative numbers; fixed with `!== 0` check + `?? 0`
4. Mobile header overflow: "Last Updated" badge causing horizontal scroll; fixed with flex-wrap + overflow-x
5. Toast stale closure: dismiss button not updating localStorage; fixed with useCallback + functional setState
6. Share card layout: 4th team card overlapped footer; fixed cardHeight 200→192
7. Dead code: removed 4 unused utility functions
8. Google Fonts: trimmed from 11 weights to 4
