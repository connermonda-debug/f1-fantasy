// F1 Fantasy — Template-based race recap generator
// Pure JS, no AI — generates narrative summaries from race data

import { DRIVERS, FANTASY_TEAMS, CONSTRUCTORS, CALENDAR } from '../data'

/**
 * Generate a narrative recap for a race weekend
 * @param {Object} race - Race result data (from RESULTS)
 * @param {Object} teamResults - { teamKey: { totalPoints, driverResults, constructorBonuses } }
 * @param {Object} calendar - Calendar entry for this round
 * @param {Array} standings - Current season standings array
 * @returns {string} Narrative recap text
 */
export function generateRecap(race, teamResults, calendar, standings) {
  if (!race || !calendar) return ''

  const parts = []
  const location = calendar.location
  const raceName = calendar.name
  const round = race.round
  const totalRaces = CALENDAR.length

  // 1. Grid / Race headline
  if (race.race && race.race.length > 0) {
    const winner = DRIVERS[race.race[0]]
    const p2 = DRIVERS[race.race[1]]
    const p3 = DRIVERS[race.race[2]]
    if (winner) {
      parts.push(`${winner.name} won Round ${round} in ${location}${p2 && p3 ? `, followed by ${p2.name} and ${p3.name} on the podium` : ''}.`)
    }
  } else if (race.qualifying && race.qualifying.length > 0) {
    const polesitter = DRIVERS[race.qualifying[0]]
    if (polesitter) {
      parts.push(`${polesitter.name} claimed pole position for Round ${round} in ${location}.`)
    }
  }

  // 2. Fantasy team performance
  if (teamResults) {
    const sorted = Object.entries(teamResults)
      .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)

    const [bestKey, bestResult] = sorted[0]
    const bestTeam = FANTASY_TEAMS[bestKey]
    const [worstKey, worstResult] = sorted[sorted.length - 1]
    const worstTeam = FANTASY_TEAMS[worstKey]

    if (bestTeam) {
      const gap = bestResult.totalPoints - sorted[1]?.[1]?.totalPoints
      if (gap > 5) {
        parts.push(`${bestTeam.name}'s team dominated the weekend with ${bestResult.totalPoints} points, ${gap} ahead of the competition.`)
      } else {
        parts.push(`${bestTeam.name}'s team topped the fantasy standings this round with ${bestResult.totalPoints} points.`)
      }
    }
  }

  // 3. Notable performances
  const notables = []

  if (race.fastestLap) {
    const fl = DRIVERS[race.fastestLap]
    if (fl) notables.push(`${fl.short} set the fastest lap`)
  }
  if (race.driverOfTheDay) {
    const dotd = DRIVERS[race.driverOfTheDay]
    if (dotd) notables.push(`${dotd.name} earned Driver of the Day`)
  }
  if (race.dnfs && race.dnfs.length > 0) {
    const dnfNames = race.dnfs.map(d => DRIVERS[d]?.short || d).filter(Boolean)
    if (dnfNames.length === 1) {
      notables.push(`${dnfNames[0]} retired from the race`)
    } else if (dnfNames.length > 1) {
      notables.push(`${dnfNames.join(' and ')} retired from the race`)
    }
  }
  if (race.fastestPitStop) {
    const c = CONSTRUCTORS[race.fastestPitStop]
    if (c) notables.push(`${c.name} had the fastest pit stop`)
  }

  if (notables.length > 0) {
    parts.push(notables.join(', ') + '.')
  }

  // 4. Sprint mention
  if (race.sprint && race.sprint.length > 0) {
    const sprintWinner = DRIVERS[race.sprint[0]]
    if (sprintWinner) {
      parts.push(`${sprintWinner.name} took the sprint race victory.`)
    }
  }

  // 5. Season context
  const remaining = totalRaces - round
  if (remaining > 0 && standings?.length >= 2) {
    const leader = standings[0]
    const runnerUp = standings[1]
    const gap = leader.totalPoints - runnerUp.totalPoints
    if (gap === 0) {
      parts.push(`${leader.name} and ${runnerUp.name} are tied at the top with ${remaining} race${remaining === 1 ? '' : 's'} to go.`)
    } else if (gap <= 5) {
      parts.push(`${leader.name} leads ${runnerUp.name} by just ${gap} point${gap === 1 ? '' : 's'} with ${remaining} race${remaining === 1 ? '' : 's'} remaining.`)
    } else {
      parts.push(`${remaining} race${remaining === 1 ? '' : 's'} remaining in the season.`)
    }
  } else if (remaining === 0) {
    parts.push(`That's the final race of the season!`)
  }

  return parts.join(' ')
}
