// F1 Fantasy League — Scoring Engine

import { DRIVERS, FANTASY_TEAMS, CONSTRUCTORS, SCORING, RESULTS, CALENDAR } from './data';

/**
 * Get constructor pairs for a fantasy team
 * Returns constructors where the team has BOTH drivers
 */
export function getConstructorPairs(teamDrivers) {
  const pairs = [];
  for (const [cKey, constructor] of Object.entries(CONSTRUCTORS)) {
    if (constructor.drivers.length >= 2) {
      const hasAll = constructor.drivers.every(d => teamDrivers.includes(d));
      if (hasAll) {
        pairs.push(cKey);
      }
    }
  }
  return pairs;
}

/**
 * Calculate points for a single driver in a single race
 */
export function calculateDriverRacePoints(driverKey, race) {
  let points = 0;
  const breakdown = {};

  // Qualifying points (P1=10 down to P10=1)
  if (race.qualifying) {
    const pos = race.qualifying.indexOf(driverKey) + 1;
    if (pos > 0 && pos <= 10) {
      const pts = SCORING.qualifying[pos];
      points += pts;
      breakdown.qualifying = { position: pos, points: pts };
    }
  }

  // Race points (standard F1: P1=25 ... P10=1)
  if (race.race) {
    const pos = race.race.indexOf(driverKey) + 1;
    if (pos > 0 && pos <= 10) {
      const pts = SCORING.race[pos];
      points += pts;
      breakdown.race = { position: pos, points: pts };
    }
  }

  // Sprint points (P1=8 ... P8=1)
  if (race.sprint) {
    const pos = race.sprint.indexOf(driverKey) + 1;
    if (pos > 0 && pos <= 8) {
      const pts = SCORING.sprint[pos];
      points += pts;
      breakdown.sprint = { position: pos, points: pts };
    }
  }

  // Fastest Lap bonus
  if (race.fastestLap === driverKey) {
    points += SCORING.fastestLap;
    breakdown.fastestLap = SCORING.fastestLap;
  }

  // Driver of the Day bonus
  if (race.driverOfTheDay === driverKey) {
    points += SCORING.driverOfTheDay;
    breakdown.driverOfTheDay = SCORING.driverOfTheDay;
  }

  // DNF penalty
  if (race.dnfs && race.dnfs.includes(driverKey)) {
    points += SCORING.dnf;
    breakdown.dnf = SCORING.dnf;
  }

  return { points, breakdown };
}

/**
 * Calculate team points for a single race
 */
export function calculateTeamRacePoints(teamKey, race) {
  const team = FANTASY_TEAMS[teamKey];
  let totalPoints = 0;
  const driverResults = {};

  // Sum each driver's points
  for (const driverKey of team.drivers) {
    const result = calculateDriverRacePoints(driverKey, race);
    driverResults[driverKey] = result;
    totalPoints += result.points;
  }

  // Constructor bonuses
  const constructorBonuses = {};
  const pairs = getConstructorPairs(team.drivers);
  for (const cKey of pairs) {
    if (race.fastestPitStop === cKey) {
      totalPoints += SCORING.fastestPitStop;
      constructorBonuses[cKey] = { fastestPitStop: SCORING.fastestPitStop };
    }
  }

  return { totalPoints, driverResults, constructorBonuses };
}

/**
 * Calculate full season standings
 */
export function calculateStandings() {
  const standings = {};

  // Initialize
  for (const [teamKey, team] of Object.entries(FANTASY_TEAMS)) {
    standings[teamKey] = {
      key: teamKey,
      name: team.name,
      color: team.color,
      gradient: team.gradient,
      totalPoints: 0,
      raceHistory: [],
      driverTotals: {},
    };
    for (const d of team.drivers) {
      standings[teamKey].driverTotals[d] = 0;
    }
  }

  // Process each completed race
  for (const race of RESULTS) {
    for (const [teamKey, team] of Object.entries(FANTASY_TEAMS)) {
      const raceResult = calculateTeamRacePoints(teamKey, race);
      standings[teamKey].totalPoints += raceResult.totalPoints;
      standings[teamKey].raceHistory.push({
        round: race.round,
        points: raceResult.totalPoints,
        driverResults: raceResult.driverResults,
        constructorBonuses: raceResult.constructorBonuses,
      });
      // Accumulate per-driver totals
      for (const [dKey, dResult] of Object.entries(raceResult.driverResults)) {
        standings[teamKey].driverTotals[dKey] += dResult.points;
      }
    }
  }

  // Sort by total points descending
  const sorted = Object.values(standings).sort((a, b) => b.totalPoints - a.totalPoints);

  // Assign positions
  sorted.forEach((team, i) => { team.position = i + 1; });

  return sorted;
}

/**
 * Get detailed results for a specific race round
 */
export function getRaceDetails(round) {
  const race = RESULTS.find(r => r.round === round);
  if (!race) return null;

  const teamResults = {};
  for (const teamKey of Object.keys(FANTASY_TEAMS)) {
    teamResults[teamKey] = calculateTeamRacePoints(teamKey, race);
  }

  return { race, teamResults };
}

/**
 * Format position with suffix (1st, 2nd, 3rd, etc.)
 */
export function formatPosition(pos) {
  if (!pos) return '—';
  const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
  const suffix = suffixes[pos] || 'th';
  return `P${pos}`;
}

/**
 * Get the race calendar entry for a round
 */
export function getCalendarRace(round) {
  return CALENDAR.find(r => r.round === round);
}

/**
 * Check if a race has been completed (has results)
 */
export function isRaceCompleted(round) {
  return RESULTS.some(r => r.round === round);
}

/**
 * Get season stats
 */
export function getSeasonStats() {
  const standings = calculateStandings();
  const completedRaces = RESULTS.length;

  let bestSingleRace = { team: '', points: 0, round: 0 };
  let mostDNFs = { team: '', count: 0 };

  for (const team of standings) {
    let dnfCount = 0;
    for (const rh of team.raceHistory) {
      if (rh.points > bestSingleRace.points) {
        bestSingleRace = { team: team.name, points: rh.points, round: rh.round };
      }
      for (const dr of Object.values(rh.driverResults)) {
        if (dr.breakdown.dnf) dnfCount++;
      }
    }
    if (dnfCount > mostDNFs.count) {
      mostDNFs = { team: team.name, count: dnfCount };
    }
  }

  return { completedRaces, bestSingleRace, mostDNFs, standings };
}
