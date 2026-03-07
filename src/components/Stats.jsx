import { useMemo } from 'react'
import { RESULTS, CALENDAR, DRIVERS, FANTASY_TEAMS } from '../data'
import { getRaceDetails } from '../utils'
import { generateRecap } from '../utils/generateRecap'
import SeasonChart from './SeasonChart'

export default function Stats({ standings }) {
  const stats = useMemo(() => computeStats(standings), [standings])

  // Memoize race recaps — getRaceDetails + generateRecap for every round
  const recaps = useMemo(() => {
    return [...RESULTS].reverse().map(race => {
      const cal = CALENDAR.find(c => c.round === race.round)
      const details = getRaceDetails(race.round)
      const recap = generateRecap(race, details?.teamResults, cal, standings)
      return { round: race.round, name: cal?.name || `Race ${race.round}`, recap }
    })
  }, [standings])

  if (RESULTS.length === 0) {
    return (
      <div className="animate-in">
        <h1 className="page-title">Stats</h1>
        <div className="empty-state">
          <div className="empty-state-flag" />
          <h2>No stats yet</h2>
          <p>Season stats and charts will appear after the first race.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in">
      <h1 className="page-title">Stats</h1>

      {/* Season Points Chart */}
      {RESULTS.length > 0 && (
        <div className="stats-section">
          <h2 className="stats-section-title">Season Progress</h2>
          <div className="stats-chart-container">
            <SeasonChart standings={standings} />
          </div>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="stats-section">
        <h2 className="stats-section-title">Season Highlights</h2>
        <div className="stat-cards-grid">
          {/* Best Weekend */}
          <div className="stat-card">
            <div className="stat-card-icon">🏆</div>
            <div className="stat-card-label">Best Weekend</div>
            <div className="stat-card-value" style={{ color: stats.bestWeekend.color }}>
              {stats.bestWeekend.team}
            </div>
            <div className="stat-card-detail">
              {stats.bestWeekend.points} pts — R{stats.bestWeekend.round} {stats.bestWeekend.raceName}
            </div>
          </div>

          {/* Worst Weekend */}
          <div className="stat-card">
            <div className="stat-card-icon">📉</div>
            <div className="stat-card-label">Worst Weekend</div>
            <div className="stat-card-value" style={{ color: stats.worstWeekend.color }}>
              {stats.worstWeekend.team}
            </div>
            <div className="stat-card-detail">
              {stats.worstWeekend.points} pts — R{stats.worstWeekend.round} {stats.worstWeekend.raceName}
            </div>
          </div>

          {/* Top Scoring Driver */}
          <div className="stat-card">
            <div className="stat-card-icon">⭐</div>
            <div className="stat-card-label">Top Driver</div>
            <div className="stat-card-value">
              {stats.topDriver.name}
            </div>
            <div className="stat-card-detail">
              {stats.topDriver.points} pts — {stats.topDriver.teamName}'s team
            </div>
          </div>

          {/* Points Leader */}
          <div className="stat-card">
            <div className="stat-card-icon">👑</div>
            <div className="stat-card-label">Championship Leader</div>
            <div className="stat-card-value" style={{ color: standings[0]?.color }}>
              {standings[0]?.name}
            </div>
            <div className="stat-card-detail">
              {standings[0]?.totalPoints} pts — {standings[0]?.totalPoints - (standings[1]?.totalPoints || 0)} ahead
            </div>
          </div>

          {/* Per-team best weekends */}
          {stats.teamBests.map(tb => (
            <div key={tb.key} className="stat-card">
              <div className="stat-card-color-bar" style={{ background: tb.color }} />
              <div className="stat-card-label">{tb.name}'s Best</div>
              <div className="stat-card-value" style={{ color: tb.color }}>
                {tb.bestPoints} pts
              </div>
              <div className="stat-card-detail">
                R{tb.bestRound} {tb.bestRaceName}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Race Recaps */}
      <div className="stats-section">
        <h2 className="stats-section-title">Race Recaps</h2>
        <div className="recap-list">
          {recaps.map(r => (
            <div key={r.round} className="recap-card">
              <div className="recap-header">
                <span className="recap-round">R{r.round}</span>
                <span className="recap-race-name">{r.name}</span>
              </div>
              <p className="recap-text">{r.recap}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function computeStats(standings) {
  let bestWeekend = { team: '—', points: -Infinity, round: 0, raceName: '', color: '' }
  let worstWeekend = { team: '—', points: Infinity, round: 0, raceName: '', color: '' }
  const teamBests = []

  for (const team of standings) {
    let teamBest = { points: -Infinity, round: 0, raceName: '' }
    let teamWorst = { points: Infinity, round: 0, raceName: '' }

    for (const rh of team.raceHistory) {
      const cal = CALENDAR.find(c => c.round === rh.round)
      const raceName = cal?.location || ''

      if (rh.points > teamBest.points) {
        teamBest = { points: rh.points, round: rh.round, raceName }
      }
      if (rh.points < teamWorst.points) {
        teamWorst = { points: rh.points, round: rh.round, raceName }
      }

      if (rh.points > bestWeekend.points) {
        bestWeekend = { team: team.name, points: rh.points, round: rh.round, raceName, color: team.color }
      }
      if (rh.points < worstWeekend.points) {
        worstWeekend = { team: team.name, points: rh.points, round: rh.round, raceName, color: team.color }
      }
    }

    teamBests.push({
      key: team.key,
      name: team.name,
      color: team.color,
      bestPoints: teamBest.points === -Infinity ? 0 : teamBest.points,
      bestRound: teamBest.round,
      bestRaceName: teamBest.raceName,
    })
  }

  // Find top scoring driver across all teams
  let topDriver = { name: '—', points: 0, teamName: '' }
  for (const team of standings) {
    for (const [dKey, pts] of Object.entries(team.driverTotals)) {
      if (pts > topDriver.points) {
        topDriver = {
          name: DRIVERS[dKey]?.name || dKey,
          points: pts,
          teamName: team.name,
        }
      }
    }
  }

  return {
    bestWeekend: bestWeekend.points === -Infinity ? { ...bestWeekend, points: 0 } : bestWeekend,
    worstWeekend: worstWeekend.points === Infinity ? { ...worstWeekend, points: 0 } : worstWeekend,
    topDriver,
    teamBests,
  }
}
