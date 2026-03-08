import { useState, useMemo } from 'react'
import { RESULTS, CALENDAR, DRIVERS, FANTASY_TEAMS, CONSTRUCTORS, SCORING } from '../data'
import { getRaceDetails } from '../utils'

export default function RaceView({ standings }) {
  const completedRounds = RESULTS.map(r => r.round)
  const [selectedRound, setSelectedRound] = useState(
    completedRounds.length > 0 ? completedRounds[completedRounds.length - 1] : null
  )
  const [sharing, setSharing] = useState(false)

  if (RESULTS.length === 0) {
    return (
      <div className="animate-in">
        <h1 className="page-title">Race Results</h1>
        <div className="empty-state">
          <div className="empty-state-flag" />
          <h2>No races completed yet</h2>
          <p>Detailed race breakdowns will appear here after each weekend.</p>
        </div>
      </div>
    )
  }

  const raceCalendar = CALENDAR.find(c => c.round === selectedRound)
  const details = useMemo(() => getRaceDetails(selectedRound), [selectedRound])
  const race = details?.race

  // Sort teams by points for this race
  const teamOrder = Object.entries(details?.teamResults || {})
    .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)

  const handleShare = async () => {
    if (!details?.teamResults || sharing) return
    setSharing(true)
    try {
      const { shareRaceCard } = await import('../utils/generateShareCard')
      await shareRaceCard(selectedRound, details.teamResults)
    } catch (e) {
      console.error('Share failed:', e)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="animate-in">
      <h1 className="page-title">Race Results</h1>

      {/* Race Selector */}
      <div className="race-selector">
        <select
          className="race-select"
          value={selectedRound}
          onChange={(e) => setSelectedRound(Number(e.target.value))}
        >
          {completedRounds.map(round => {
            const cal = CALENDAR.find(c => c.round === round)
            return (
              <option key={round} value={round}>
                Round {round}: {cal?.name || `Race ${round}`}
              </option>
            )
          })}
        </select>
        <button
          className="share-btn"
          onClick={handleShare}
          disabled={sharing}
          title="Share race card"
        >
          {sharing ? '...' : '📤 Share'}
        </button>
      </div>

      {/* Race Header */}
      {raceCalendar && (
        <div className="race-header-card">
          <div className="race-round">Round {raceCalendar.round}</div>
          <div className="race-name">{raceCalendar.name}</div>
          <div className="race-location">
            {raceCalendar.circuit} — {raceCalendar.location}
          </div>
          <div className="race-badges">
            <span className="race-badge">{formatDate(raceCalendar.date)}</span>
            {raceCalendar.sprint && <span className="race-badge sprint">Sprint Weekend</span>}
          </div>
        </div>
      )}

      {/* Bonuses Row — only show when race/sprint data exists */}
      {race && (race.race || race.sprint || race.fastestLap || race.driverOfTheDay || race.fastestPitStop || (race.dnfs && race.dnfs.length > 0)) && (
        <div className="race-bonuses" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="bonus-grid">
            <div className="bonus-item">
              <span className="bonus-label">Fastest Lap (+{SCORING.fastestLap})</span>
              <span className="bonus-value">
                {race.fastestLap ? DRIVERS[race.fastestLap]?.name : '—'}
              </span>
            </div>
            <div className="bonus-item">
              <span className="bonus-label">Driver of the Day (+{SCORING.driverOfTheDay})</span>
              <span className="bonus-value">
                {race.driverOfTheDay ? DRIVERS[race.driverOfTheDay]?.name : '—'}
              </span>
            </div>
            <div className="bonus-item">
              <span className="bonus-label">Fastest Pit Stop (+{SCORING.fastestPitStop})</span>
              <span className="bonus-value">
                {race.fastestPitStop ? CONSTRUCTORS[race.fastestPitStop]?.name : '—'}
              </span>
            </div>
            {race.dnfs && race.dnfs.length > 0 && (
              <div className="bonus-item">
                <span className="bonus-label">DNFs ({SCORING.dnf} each)</span>
                <span className="bonus-value" style={{ color: '#EF4444' }}>
                  {race.dnfs.map(d => DRIVERS[d]?.short || d).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Cards */}
      <div className="race-results-grid">
        {teamOrder.map(([teamKey, result]) => {
          const team = FANTASY_TEAMS[teamKey]
          return (
            <div key={teamKey} className="race-team-card">
              <div className="race-team-header" style={{ borderTop: `3px solid ${team.color}` }}>
                <span className="race-team-name">{team.name}</span>
                <span className="race-team-total" style={{ color: team.color }}>
                  {result.totalPoints} pts
                </span>
              </div>
              {team.drivers.map(driverKey => {
                const driver = DRIVERS[driverKey]
                const dResult = result.driverResults[driverKey]
                const bd = dResult?.breakdown || {}
                const constructorColor = CONSTRUCTORS[driver?.constructor]?.color || '#666'
                const pts = dResult?.points || 0
                return (
                  <div key={driverKey} className="race-driver-row">
                    <div className="driver-color-dot" style={{ background: constructorColor }} />
                    <span className="driver-name-short">{driver?.short}</span>
                    <div className="driver-detail">
                      {bd.qualifying && (
                        <span className="driver-detail-tag">Q: P{bd.qualifying.position} (+{bd.qualifying.points})</span>
                      )}
                      {bd.race && (
                        <span className="driver-detail-tag">R: P{bd.race.position} (+{bd.race.points})</span>
                      )}
                      {bd.sprint && (
                        <span className="driver-detail-tag">S: P{bd.sprint.position} (+{bd.sprint.points})</span>
                      )}
                      {bd.fastestLap && (
                        <span className="driver-detail-tag bonus">FL +{bd.fastestLap}</span>
                      )}
                      {bd.driverOfTheDay && (
                        <span className="driver-detail-tag bonus">DOTD +{bd.driverOfTheDay}</span>
                      )}
                      {bd.dnf && (
                        <span className="driver-detail-tag penalty">DNF {bd.dnf}</span>
                      )}
                    </div>
                    <span className={`driver-points ${pts > 0 ? 'positive' : pts < 0 ? 'negative' : 'zero'}`}>
                      {pts > 0 ? `+${pts}` : pts}
                    </span>
                  </div>
                )
              })}
              {/* Constructor bonuses */}
              {Object.entries(result.constructorBonuses || {}).map(([cKey, bonus]) => (
                <div key={cKey} className="race-driver-row" style={{ background: 'rgba(225,6,0,0.03)' }}>
                  <div className="driver-color-dot" style={{ background: 'var(--f1-red)' }} />
                  <span className="driver-name-short" style={{ color: 'var(--f1-red)', fontSize: '0.7rem' }}>TEAM</span>
                  <div className="driver-detail">
                    <span className="driver-detail-tag bonus">
                      {CONSTRUCTORS[cKey]?.name} Fastest Pit +{bonus.fastestPitStop}
                    </span>
                  </div>
                  <span className="driver-points positive">+{bonus.fastestPitStop}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
