#!/usr/bin/env node
// scripts/fetch-results.mjs
// Fetches F1 race results from Jolpica API and updates src/results.json
// Run by GitHub Actions daily, or manually: node scripts/fetch-results.mjs

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_PATH = join(__dirname, '..', 'src', 'results.json');
const DATA_PATH = join(__dirname, '..', 'src', 'data.js');
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Custom error so callers can distinguish "API unreachable" from "bad data".
class ApiUnreachableError extends Error {
  constructor(url, cause) {
    super(`API unreachable: ${url} (${cause?.code || cause?.message || cause})`);
    this.name = 'ApiUnreachableError';
  }
}

// fetchJSON with timeout + retry on transient failures.
// - 30s per-request timeout (Jolpica is sometimes slow but usually responds)
// - 3 attempts with exponential backoff (1s, 3s, 9s)
// - 404 → returns null (the round/session doesn't exist yet, which is normal)
// - Final failure throws ApiUnreachableError, never crashes the process
async function fetchJSON(url, { attempts = 3 } = {}) {
  let lastErr = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        if (res.status === 404) return null;
        // 429 (rate limited) — Jolpica returns Retry-After sometimes; if not,
        // back off with much longer waits. Rate limits reset on a rolling
        // window, so a proper pause usually clears them.
        if (res.status === 429 && attempt < attempts) {
          const retryAfterHeader = parseInt(res.headers.get('retry-after') || '');
          const waitMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
            ? retryAfterHeader * 1000
            : 5000 * Math.pow(2, attempt - 1); // 5s, 10s, 20s
          console.log(`  rate limited on ${url}, waiting ${waitMs}ms before retry ${attempt}/${attempts}`);
          lastErr = new Error(`HTTP 429 for ${url}`);
          await sleep(waitMs);
          continue;
        }
        // Persistent 429 after retries — treat as temporary unreachability
        // so the per-round handler preserves existing data instead of
        // crashing the whole workflow.
        if (res.status === 429) {
          throw new ApiUnreachableError(url, new Error('HTTP 429 (rate limited after retries)'));
        }
        // 5xx — server error, worth retrying
        if (res.status >= 500 && attempt < attempts) {
          lastErr = new Error(`HTTP ${res.status} for ${url}`);
          await sleep(1000 * Math.pow(3, attempt - 1));
          continue;
        }
        // Persistent 5xx after retries — treat as unreachable, same reason.
        if (res.status >= 500) {
          throw new ApiUnreachableError(url, new Error(`HTTP ${res.status}`));
        }
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      lastErr = err;
      // Network-level failures (timeout, DNS, connection refused) — retry
      const isNetwork = err.name === 'AbortError' ||
                        err.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                        err.code === 'ENOTFOUND' ||
                        err.code === 'ECONNREFUSED' ||
                        err.code === 'ECONNRESET' ||
                        err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                        err.cause?.code === 'ECONNREFUSED';
      if (isNetwork && attempt < attempts) {
        console.log(`  retry ${attempt}/${attempts} for ${url} (${err.code || err.cause?.code || err.message})`);
        await sleep(1000 * Math.pow(3, attempt - 1));
        continue;
      }
      // Out of retries on a network error — surface as ApiUnreachableError
      if (isNetwork) throw new ApiUnreachableError(url, err);
      throw err;
    }
  }
  throw new ApiUnreachableError(url, lastErr);
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

// ── Fetch one round's full dataset ──
// CRITICAL: Jolpica's `limit` parameter silently caps at 100, even when we ask
// for more. The season-wide endpoints (e.g. /2026/results.json) blow past 100
// total rows after ~5 races (5 × 22 drivers = 110), and the LAST rounds get
// truncated — losing the drivers with the lowest finishing positions, which
// are exactly the DNFs and retirements we need for scoring. We fetch each
// round individually so each session stays well under the 100-row cap.
async function fetchRoundSession(round, session) {
  // session = 'qualifying' | 'results' | 'sprint'
  const data = await fetchJSON(`${API_BASE}/${SEASON}/${round}/${session}.json?limit=100`);
  return data?.MRData?.RaceTable?.Races?.[0] || null;
}

// ── Calendar drift check ──
// The F1 calendar changes mid-season (races cancelled, relocated, added).
// This has happened twice already in 2026: Bahrain + Saudi were cancelled
// pre-season, then Bahrain returned at Sepang as a new round 16.
//
// CALENDAR in data.js is display-only — the scoring engine never reads it,
// so drift can't corrupt points. But it WILL show wrong race names, dates,
// and sprint badges, so we surface it loudly in the workflow log rather
// than waiting for someone to notice on the site.
function checkCalendarDrift(scheduled) {
  let js;
  try {
    js = readFileSync(DATA_PATH, 'utf8');
  } catch {
    return; // data.js unreadable — not this script's job to fail on that
  }
  const block = js.split('export const CALENDAR = [')[1]?.split('];')[0];
  if (!block) return;

  const local = new Map();
  const rowRe = /round:\s*(\d+),\s*name:\s*'([^']+)',\s*location:\s*'[^']*',\s*circuit:\s*'[^']*',\s*date:\s*'([^']+)',\s*sprint:\s*(true|false)/g;
  let m;
  while ((m = rowRe.exec(block)) !== null) {
    local.set(parseInt(m[1]), { name: m[2], date: m[3], sprint: m[4] === 'true' });
  }

  const drift = [];
  for (const a of scheduled) {
    const rd = parseInt(a.round);
    const l = local.get(rd);
    if (!l) {
      drift.push(`R${rd} ${a.raceName} missing from CALENDAR`);
      continue;
    }
    if (l.date !== a.date) drift.push(`R${rd} date: calendar=${l.date} api=${a.date}`);
    if (l.sprint !== ('Sprint' in a)) drift.push(`R${rd} sprint flag differs`);
    if (l.name !== a.raceName) drift.push(`R${rd} name: calendar="${l.name}" api="${a.raceName}"`);
  }
  for (const rd of local.keys()) {
    if (!scheduled.some(a => parseInt(a.round) === rd)) {
      drift.push(`R${rd} ${local.get(rd).name} in CALENDAR but not in API (cancelled?)`);
    }
  }

  if (drift.length > 0) {
    console.log('');
    console.log('  ' + '='.repeat(64));
    console.log('  CALENDAR DRIFT DETECTED — src/data.js needs updating');
    console.log('  (display only; scoring is unaffected)');
    for (const d of drift) console.log(`    - ${d}`);
    console.log('  ' + '='.repeat(64));
    console.log('');
  } else {
    console.log(`  Calendar: in sync with API (${scheduled.length} races)`);
  }
}

// ── Discover which rounds have any data this season ──
async function discoverRounds() {
  // The schedule endpoint tells us every round that EXISTS (whether or not it
  // has run yet). We then probe each round's qualifying/results/sprint
  // endpoints individually — slower but accurate, with no pagination risk.
  const seasonMeta = await fetchJSON(`${API_BASE}/${SEASON}.json?limit=100`);
  const scheduled = seasonMeta?.MRData?.RaceTable?.Races || [];

  // Warn (don't fail) if the local display calendar has drifted from the API
  checkCalendarDrift(scheduled);

  // Probe rounds whose race date is within the next 4 days OR has passed.
  // Sprint weekends start Friday (2 days before race), regular weekends
  // start Friday practice with Saturday qualifying. The +4 window catches
  // session data published before race day (qualifying, sprint, practice).
  // Empty-response handling and validateRound() ensure rounds without data
  // yet don't pollute results.json.
  const todayMs = new Date().setUTCHours(0, 0, 0, 0);
  const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
  return scheduled
    .filter(r => {
      if (!r.date) return false;
      const raceMs = new Date(r.date + 'T00:00:00Z').getTime();
      return raceMs <= todayMs + FOUR_DAYS_MS;
    })
    .map(r => ({ round: parseInt(r.round), raceName: r.raceName }));
}

// ── Sanity check on a built round entry ──
// If a race entry exists, we expect at least 18 drivers represented across
// race + dnfs (a few may be DNS, but never half the field missing). Same for
// qualifying. This catches truncation, partial fetches, or other anomalies
// BEFORE they overwrite good data on disk.
function validateRound(result) {
  const issues = [];
  if (result.race) {
    const totalAccountedFor = (result.race?.length || 0) + (result.dnfs?.length || 0);
    if (totalAccountedFor < 18) {
      issues.push(`only ${totalAccountedFor} drivers across race+dnfs (expected ≥18)`);
    }
  }
  if (result.qualifying && result.qualifying.length < 18) {
    issues.push(`only ${result.qualifying.length} drivers in qualifying (expected ≥18)`);
  }
  if (result.sprint && result.sprint.length < 15) {
    issues.push(`only ${result.sprint.length} drivers in sprint (expected ≥15)`);
  }
  return issues;
}

// ── Main ──

async function main() {
  console.log(`Fetching ${SEASON} F1 results...`);

  // 1. Discover which rounds to fetch (only ones whose date has passed)
  let roundList;
  try {
    roundList = await discoverRounds();
  } catch (err) {
    if (err instanceof ApiUnreachableError) {
      console.log(`  ⚠️  Jolpica API unreachable for schedule lookup: ${err.message}`);
      console.log(`  Skipping this run — next scheduled run will retry. No data changed.`);
      return; // Exit 0 — not a failure, just a temporary outage
    }
    throw err;
  }
  if (roundList.length === 0) {
    console.log('No completed rounds yet for this season.');
    return;
  }
  console.log(`  Rounds to fetch: ${roundList.length}`);

  // 2. Fetch each round's three sessions SEQUENTIALLY (not parallel).
  // Reason: Jolpica has a per-IP burst rate limit. With ~11 rounds × 3
  // sessions in parallel we get 429s. Sequential + inter-request delays
  // keeps us well under the throttle threshold.
  //
  // Track per-round outages — if a round's whole fetch fails, the
  // preservation logic later will keep existing data on disk.
  const qualByRound = {};
  const raceByRound = {};
  const sprintByRound = {};
  const failedRounds = [];
  const REQUEST_DELAY_MS = 400; // between individual session fetches
  for (const { round } of roundList) {
    try {
      const q = await fetchRoundSession(round, 'qualifying');
      await sleep(REQUEST_DELAY_MS);
      const r = await fetchRoundSession(round, 'results');
      await sleep(REQUEST_DELAY_MS);
      const s = await fetchRoundSession(round, 'sprint');
      await sleep(REQUEST_DELAY_MS);
      if (q) qualByRound[round] = q;
      if (r) raceByRound[round] = r;
      if (s) sprintByRound[round] = s;
    } catch (err) {
      if (err instanceof ApiUnreachableError) {
        console.log(`  ⚠️  R${round}: API unreachable, will preserve existing data`);
        failedRounds.push(round);
        continue;
      }
      throw err;
    }
  }

  // If every round failed, the API is fully down — exit cleanly, no diff to write.
  if (failedRounds.length === roundList.length) {
    console.log(`  ⚠️  All ${roundList.length} rounds failed to fetch. API appears fully down.`);
    console.log(`  Skipping this run — next scheduled run will retry. No data changed.`);
    return;
  }

  const qualRaces = Object.values(qualByRound);
  const raceRaces = Object.values(raceByRound);
  const sprintRaces = Object.values(sprintByRound);
  console.log(`  Qualifying sessions: ${qualRaces.length} rounds`);
  console.log(`  Races: ${raceRaces.length} rounds`);
  console.log(`  Sprints: ${sprintRaces.length} rounds`);

  if (qualRaces.length === 0 && raceRaces.length === 0) {
    console.log('No results available yet for this season.');
    return;
  }

  // 3. Collect all rounds that have any data
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
        try {
          const flFallback = await fetchFastestLapForRound(round);
          if (flFallback) {
            result.fastestLap = flFallback;
            console.log(`  R${round}: fastest lap from fallback → ${flFallback}`);
          }
        } catch (err) {
          if (err instanceof ApiUnreachableError) {
            console.log(`  R${round}: FL fallback unreachable, preservation logic will keep prior value`);
          } else { throw err; }
        }
      }

      // Fastest pit stop — non-critical, skip on failure
      console.log(`  Fetching pit stops for round ${round}...`);
      await sleep(300);
      try {
        const pitData = await fetchJSON(`${API_BASE}/${SEASON}/${round}/pitstops.json?limit=100`);
        const fastestPit = findFastestPitStop(pitData, race.Results);
        if (fastestPit) {
          result.fastestPitStop = fastestPit;
        }
      } catch (err) {
        if (err instanceof ApiUnreachableError) {
          console.log(`  R${round}: pit stops unreachable, preservation logic will keep prior value`);
        } else { throw err; }
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

    // Preserve existing data when API returns less than what we already have.
    // The API can briefly drop session data (delays after race end, transient
    // 404s, mid-update reads). Once data lands in results.json it should stick;
    // a later fetch with real data will overwrite, but a fetch with no data
    // for a session won't wipe it.
    const prev = existingByRound[round];
    if (prev) {
      // Bonuses and DOTD — preserved as before
      if (!result.driverOfTheDay && prev.driverOfTheDay) {
        result.driverOfTheDay = prev.driverOfTheDay;
        console.log(`  R${round}: preserved DOTD → ${prev.driverOfTheDay}`);
      }
      if (!result.fastestLap && prev.fastestLap) {
        result.fastestLap = prev.fastestLap;
        console.log(`  R${round}: preserved fastestLap → ${prev.fastestLap}`);
      }
      if (!result.fastestPitStop && prev.fastestPitStop) {
        result.fastestPitStop = prev.fastestPitStop;
        console.log(`  R${round}: preserved fastestPitStop → ${prev.fastestPitStop}`);
      }
      // Session arrays — only fall back to prev if API returned nothing.
      // If API returns a non-empty array, trust it (corrections like DSQs,
      // post-race penalties, reclassification).
      if ((!result.race || result.race.length === 0) && prev.race?.length) {
        result.race = prev.race;
        console.log(`  R${round}: preserved race results (${prev.race.length} drivers) — API had none`);
      }
      if ((!result.qualifying || result.qualifying.length === 0) && prev.qualifying?.length) {
        result.qualifying = prev.qualifying;
        console.log(`  R${round}: preserved qualifying (${prev.qualifying.length} drivers) — API had none`);
      }
      if ((!result.sprint || result.sprint.length === 0) && prev.sprint?.length) {
        result.sprint = prev.sprint;
        console.log(`  R${round}: preserved sprint (${prev.sprint.length} drivers) — API had none`);
      }
      if ((!result.dnfs || result.dnfs.length === 0) && prev.dnfs?.length) {
        result.dnfs = prev.dnfs;
        console.log(`  R${round}: preserved DNFs (${prev.dnfs.length} drivers) — API had none`);
      }
    }

    // Sanity check — refuse to overwrite a previously good round with
    // suspicious data (e.g., 12 drivers when we expect 22).
    const issues = validateRound(result);
    if (issues.length > 0) {
      const prevIssues = prev ? validateRound(prev) : ['no previous data'];
      if (prev && prevIssues.length === 0) {
        // Previous data was good; new data has problems. Keep previous.
        console.log(`  ⚠️  R${round}: new data failed validation (${issues.join('; ')}). Keeping previous round entry intact.`);
        results.push(prev);
        continue;
      } else {
        // No good previous data — emit the new data but loudly warn.
        console.log(`  ⚠️  R${round}: data quality concerns (${issues.join('; ')}) — no clean previous to fall back to, writing anyway.`);
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
  // Treat API outages as soft failures — don't fail the workflow run, since
  // the next scheduled run will pick up automatically once the API is back.
  if (err instanceof ApiUnreachableError) {
    console.log(`\n⚠️  API unreachable: ${err.message}`);
    console.log(`Next scheduled run will retry. Exiting cleanly to avoid failure-notification spam.`);
    process.exit(0);
  }
  console.error('Fatal error:', err);
  process.exit(1);
});
