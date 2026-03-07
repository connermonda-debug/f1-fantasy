import { RESULTS, CALENDAR } from '../data'

export default function Standings({ standings }) {
  const maxPoints = Math.max(...standings.map(s => s.totalPoints), 1)

  if (RESULTS.length === 0) {
    return (
      <div className="animate-in">
        <h1 className="page-title">Championship Standings</h1>
        <div className="empty-state">
          <div className="empty-state-flag" />
          <h2>Season hasn't started yet</h2>
          <p>Results will appear here after the first race weekend.</p>
          <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>
            First race: {CALENDAR[0]?.name} — {formatDate(CALENDAR[0]?.date)}
          </p>
        </div>
      </div>
    )
  }

  const completedRounds = RESULTS.map(r => r.round)
  const completedRaces = CALENDAR.filter(c => completedRounds.includes(c.round))

  return (
    <div className="animate-in">
      <h1 className="page-title">Championship Standings</h1>

      {/* Hero Cards */}
      <div className="standings-hero">
        {standings.map((team) => {
          const lastRace = team.raceHistory?.length > 0
            ? team.raceHistory[team.raceHistory.length - 1]
            : null
          const delta = lastRace?.points || 0

          return (
            <div
              key={team.key}
              className="standings-card"
              style={{ '--card-color': team.color }}
            >
              <div className="standings-position">{team.position}</div>
              <div className="standings-name">{team.name}</div>
              <div className="standings-points">{team.totalPoints}</div>
              <div className="standings-points-label">
                Points
                {delta > 0 && (
                  <span className="standings-delta positive">
                    <span className="delta-arrow">&#9650;</span>+{delta}
                  </span>
                )}
                {delta < 0 && (
                  <span className="standings-delta negative">
                    <span className="delta-arrow">&#9660;</span>{delta}
                  </span>
                )}
                {delta === 0 && lastRace && (
                  <span className="standings-delta neutral">&#8212; 0</span>
                )}
              </div>
              <div className="standings-bar-container">
                <div
                  className="standings-bar"
                  style={{ width: `${(team.totalPoints / maxPoints) * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Race-by-Race Table */}
      <div className="standings-table-container card">
        <h3 style={{
          fontSize: '0.8rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          marginBottom: 'var(--space-md)',
        }}>
          Race-by-Race Breakdown
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="standings-table">
            <thead>
              <tr>
                <th>Team</th>
                {completedRaces.map(race => (
                  <th key={race.round} title={race.name}>
                    {race.location.slice(0, 3).toUpperCase()}
                  </th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team) => (
                <tr key={team.key} className="standings-table-row" style={{ '--row-color': team.color }}>
                  <td>
                    <span className="pos-num">{team.position}</span>
                    <span className="team-name-cell">{team.name}</span>
                  </td>
                  {completedRaces.map(race => {
                    const raceData = team.raceHistory.find(r => r.round === race.round)
                    const pts = raceData?.points || 0
                    return (
                      <td key={race.round} className={`race-points-cell ${pts > 0 ? 'has-points' : ''}`}>
                        {pts || '—'}
                      </td>
                    )
                  })}
                  <td className="total-points-cell" style={{ color: team.color }}>
                    {team.totalPoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
