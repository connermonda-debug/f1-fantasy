#!/usr/bin/env node
// scripts/fetch-results.mjs
// Fetches F1 race results from Jolpica API and updates src/results.json
// Run by GitHub Actions daily, or manually: node scripts/fetch-results.mjs

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_PATH = join(__dirname, '..', 'src', 'results.json');
const SEASON = 2026;
const API_BASE = 'https://api.jolpi.ca/ergast/f1';

// ── Driver ID mapping: Ergast driverId → local key ──
const DRIVER_MAP = {
  max_verstappen: 'verstappen',
  norris: 'norris',
  piastri: 'piastri',
  hamilton: 'hamilton',
  leclerc: 'leclerc',
  russell: 'russell',
  antonelli: 'antonelli',
  alonso: 'alonso',
  stroll: 'stroll',
  albon: 'albon',
  sainz: 'sainz',
  gasly: 'gasly',
  colapinto: 'colapinto',
  ocon: 'ocon',
  bearman: 'bearman',
  lawson: 'lawson',
  lindblad: 'lindblad',
  arvid_lindblad: 'lindblad',
  hulkenberg: 'hulkenberg',
  bortoleto: 'bortoletto',
  bortoletto: 'bortoletto',
  bottas: 'bottas',
  hadjar: 'hadjar',
  perez: 'perez',
  sergio_perez: 'perez',
};

// ── Constructor ID mapping: Ergast constructorId → local key ──
const CONSTRUCTOR_MAP = {
  mclaren: 'mclaren',
  ferrari: 'ferrari',
  red_bull: 'redbull',
  mercedes: 'mercedes',
  aston_martin: 'astonmartin',
  williams: 'williams',
  alpine: 'alpine',
  haas: 'haas',
  rb: 'rb',
  racing_bulls: 'rb',
  alphatauri: 'rb',
  sauber: 'sauber',
  kick_sauber: 'sauber',
  stake: 'sauber',
  audi: 'sauber',
  cadillac: 'cadillac',
  general_motors: 'cadillac',
  gm: 'cadillac',
};

// ── Driver full name → local key (for TracingInsights DOTD) ──
const DRIVER_NAME_MAP = {
  'Max Verstappen': 'verstappen',
  'Lando Norris': 'norris',
  'Oscar Piastri': 'piastri',
  'Lewis Hamilton': 'hamilton',
  'Charles Leclerc': 'leclerc',
  'George Russell': 'russell',
  'Kimi Antonelli': 'antonelli',
  'Andrea Kimi Antonelli': 'antonelli',
  'Fernando Alonso': 'alonso',
  'Lance Stroll': 'stroll',
  'Alex Albon': 'albon',
  'Alexander Albon': 'albon',
  'Carlos Sainz': 'sainz',
  'Carlos Sainz Jr.': 'sainz',
  'Pierre Gasly': 'gasly',
  'Franco Colapinto': 'colapinto',
  'Esteban Ocon': 'ocon',
  'Oliver Bearman': 'bearman',
  'Liam Lawson': 'lawson',
  'Arvid Lindblad': 'lindblad',
  'Nico Hulkenberg': 'hulkenberg',
  'Nico Hülkenberg': 'hulkenberg',
  'Gabriel Bortoleto': 'bortoletto',
  'Valtteri Bottas': 'bottas',
  'Isack Hadjar': 'hadjar',
  'Sergio Perez': 'perez',
  'Sergio Pérez': 'perez',
};

// ── Helpers ──

function mapDriver(ergastId) {
  return DRIVER_MAP[ergastId] || ergastId;
}

function mapConstructor(ergastId) {
  return CONSTRUCTOR_MAP[ergastId] || ergastId;
}

function isClassified(status) {
  return status === 'Finished' || status === 'Lapped' || /^\+\d+ Lap/.test(status);
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Fetch DOTD from TracingInsights (GitHub) ──

async function fetchDOTD(raceNames) {
  const dotdMap = {};
  try {
    const url = `https://raw.githubusercontent.com/TracingInsights/DOTD/main/${SEASON}/dotd_${SEASON}.json`;
    const data = await fetchJSON(url);
    if (!data?.races) return dotdMap;

    for (const race of data.races) {
      if (!race.winner) continue;
      const driverKey = DRIVER_NAME_MAP[race.winner];
      if (!driverKey) {
        console.log(`  DOTD: unknown driver name "${race.winner}" for ${race.race_name}`);
        continue;
      }
      // Match race_name to round number via raceNames (from Jolpica)
      const roundEntry = Object.entries(raceNames).find(
        ([, name]) => name === race.race_name
      );
      if (roundEntry) {
        dotdMap[parseInt(roundEntry[0])] = driverKey;
      }
    }
  } catch (e) {
    console.log(`  DOTD: TracingInsights data not available (${e.message || '404'})`);
  }
  return dotdMap;
}

// ── Fetch fastest lap via dedicated API endpoint (fallback) ──

async function fetchFastestLapForRound(round) {
  try {
    const data = await fetchJSON(`${API_BASE}/${SEASON}/${round}/fastest/1/results.json`);
    const driver = data?.MRData?.RaceTable?.Races?.[0]?.Results?.[0]?.Driver;
    if (driver) return mapDriver(driver.driverId);
  } catch (e) {
    // Silent fail
  }
  return null;
}

// ── Find fastest pit stop for a round ──

function findFastestPitStop(pitStopData, raceResults) {
  const pitStops = pitStopData?.MRData?.RaceTable?.Races?.[0]?.PitStops;
  if (!pitStops || pitStops.length === 0) return null;

  let fastest = null;
  let fastestDuration = Infinity;

  for (const ps of pitStops) {
    const duration = parseFloat(ps.duration);
    if (!isNaN(duration) && duration > 0 && duration < fastestDuration) {
      fastestDuration = duration;
      fastest = ps;
    }
  }

  if (!fastest) return null;

  // Find constructor for this driver from race results
  const result = raceResults.find(r => r.Driver.driverId === fastest.driverId);
  if (!result) return null;

  return mapConstructor(result.Constructor.constructorId);
}

// ── Main ──

async function main() {
  console.log(`Fetching ${SEASON} F1 results...`);

  // 1. Fetch all qualifying results for the season (fallback for grid positions)
  const qualData = await fetchJSON(`${API_BASE}/${SEASON}/qualifying.json?limit=1000`);
  const qualRaces = qualData?.MRData?.RaceTable?.Races || [];
  console.log(`  Qualifying sessions: ${qualRaces.length} rounds`);

  // 2. Fetch all race results for the season
  const raceData = await fetchJSON(`${API_BASE}/${SEASON}/results.json?limit=1000`);
  const raceRaces = raceData?.MRData?.RaceTable?.Races || [];
  console.log(`  Races: ${raceRaces.length} rounds`);

  // 3. Fetch all sprint results for the season
  const sprintData = await fetchJSON(`${API_BASE}/${SEASON}/sprint.json?limit=1000`);
  const sprintRaces = sprintData?.MRData?.RaceTable?.Races || [];
  console.log(`  Sprints: ${sprintRaces.length} rounds`);

  if (qualRaces.length === 0 && raceRaces.length === 0) {
    console.log('No results available yet for this season.');
    return;
  }

  // 4. Collect all rounds that have any data
  const allRounds = new Set();
  for (const r of qualRaces) allRounds.add(parseInt(r.round));
  for (const r of raceRaces) allRounds.add(parseInt(r.round));
  for (const r of sprintRaces) allRounds.add(parseInt(r.round));

  // 5. Fetch DOTD from TracingInsights
  const raceNames = {};
  for (const r of [...qualRaces, ...raceRaces]) {
    raceNames[r.round] = r.raceName;
  }
  console.log('  Fetching DOTD from TracingInsights...');
  const dotdMap = await fetchDOTD(raceNames);
  console.log(`  DOTD: found for ${Object.keys(dotdMap).length} rounds`);

  // 6. Load existing results to preserve manually-entered data
  let existing = [];
  try {
    existing = JSON.parse(readFileSync(RESULTS_PATH, 'utf8'));
  } catch {
    // File doesn't exist or is invalid
  }
  const existingByRound = {};
  for (const r of existing) existingByRound[r.round] = r;

  // 6. Build results for each round
  const results = [];

  for (const round of [...allRounds].sort((a, b) => a - b)) {
    const qual = qualRaces.find(r => parseInt(r.round) === round);
    const race = raceRaces.find(r => parseInt(r.round) === round);
    const sprint = sprintRaces.find(r => parseInt(r.round) === round);

    const result = { round };

    // Starting grid order (P1 → P20)
    // Primary: use grid positions from race results (authoritative — includes penalties)
    // Fallback: qualifying session order (preliminary, before penalties are applied)
    if (race?.Results) {
      const gridEntries = race.Results
        .filter(r => parseInt(r.grid) > 0) // exclude pit lane starts (grid=0) and null
        .sort((a, b) => parseInt(a.grid) - parseInt(b.grid));

      if (gridEntries.length > 0) {
        result.qualifying = gridEntries.map(r => mapDriver(r.Driver.driverId));
        console.log(`  R${round} grid: from race results (${result.qualifying.length} drivers, post-penalties)`);
      }
    }

    // Fallback to qualifying session if race grid data was missing or empty
    if (!result.qualifying?.length && qual?.QualifyingResults) {
      result.qualifying = qual.QualifyingResults
        .sort((a, b) => parseInt(a.position) - parseInt(b.position))
        .map(r => mapDriver(r.Driver.driverId));
      console.log(`  R${round} grid: from qualifying session (${result.qualifying.length} drivers, pre-penalties)`);
    }

    // Race finishing order (classified finishers only)
    if (race?.Results) {
      // Find leader's lap count for 90% classification threshold
      const leaderLaps = parseInt(race.Results[0]?.laps) || 0;
      const classificationThreshold = Math.floor(leaderLaps * 0.9);

      const classified = race.Results
        .filter(r => {
          if (!isClassified(r.status)) return false;
          // Drivers marked "Lapped" who completed < 90% of leader's laps
          // are effectively retirements, not true classified finishers
          const driverLaps = parseInt(r.laps) || 0;
          if (r.status === 'Lapped' && driverLaps < classificationThreshold) return false;
          return true;
        })
        .sort((a, b) => parseInt(a.position) - parseInt(b.position));

      result.race = classified.map(r => mapDriver(r.Driver.driverId));

      // DNFs — unclassified + lapped drivers below 90% threshold
      const dnfs = race.Results.filter(r => {
        if (!isClassified(r.status)) return true;
        const driverLaps = parseInt(r.laps) || 0;
        if (r.status === 'Lapped' && driverLaps < classificationThreshold) return true;
        return false;
      });
      if (dnfs.length > 0) {
        result.dnfs = dnfs.map(r => mapDriver(r.Driver.driverId));
      }

      // Fastest lap — try race results first, then dedicated endpoint
      const flResult = race.Results.find(r => r.FastestLap?.rank === '1');
      if (flResult) {
        result.fastestLap = mapDriver(flResult.Driver.driverId);
      } else {
        console.log(`  R${round}: FastestLap not in race results, trying dedicated endpoint...`);
        await sleep(300);
        const flFallback = await fetchFastestLapForRound(round);
        if (flFallback) {
          result.fastestLap = flFallback;
          console.log(`  R${round}: fastest lap from fallback → ${flFallback}`);
        }
      }

      // Fastest pit stop
      console.log(`  Fetching pit stops for round ${round}...`);
      await sleep(300);
      const pitData = await fetchJSON(`${API_BASE}/${SEASON}/${round}/pitstops.json?limit=100`);
      const fastestPit = findFastestPitStop(pitData, race.Results);
      if (fastestPit) {
        result.fastestPitStop = fastestPit;
      }
    }

    // Sprint finishing order
    if (sprint?.SprintResults) {
      const sprintClassified = sprint.SprintResults
        .filter(r => isClassified(r.status))
        .sort((a, b) => parseInt(a.position) - parseInt(b.position));

      result.sprint = sprintClassified.map(r => mapDriver(r.Driver.driverId));

      // Sprint DNFs — intentionally NOT added to result.dnfs
      // Our scoring only penalizes race DNFs (-10), not sprint DNFs
      const sprintDNFs = sprint.SprintResults.filter(r => !isClassified(r.status));
    }

    // Driver of the Day — TracingInsights first, then preserve manual entry
    if (dotdMap[round]) {
      result.driverOfTheDay = dotdMap[round];
    }

    // Preserve manually-entered fields from existing results.json
    const prev = existingByRound[round];
    if (prev) {
      if (!result.driverOfTheDay && prev.driverOfTheDay) {
        result.driverOfTheDay = prev.driverOfTheDay;
        console.log(`  R${round}: preserved manual DOTD → ${prev.driverOfTheDay}`);
      }
      if (!result.fastestLap && prev.fastestLap) {
        result.fastestLap = prev.fastestLap;
        console.log(`  R${round}: preserved manual fastestLap → ${prev.fastestLap}`);
      }
      if (!result.fastestPitStop && prev.fastestPitStop) {
        result.fastestPitStop = prev.fastestPitStop;
        console.log(`  R${round}: preserved manual fastestPitStop → ${prev.fastestPitStop}`);
      }
    }

    results.push(result);
  }

  // 7. Compare with existing and save if changed
  const newJSON = JSON.stringify(results, null, 2);
  const oldJSON = JSON.stringify(existing, null, 2);

  if (newJSON !== oldJSON) {
    writeFileSync(RESULTS_PATH, newJSON + '\n');
    console.log(`\nUpdated results.json with ${results.length} race(s).`);
  } else {
    console.log('\nNo changes detected.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
