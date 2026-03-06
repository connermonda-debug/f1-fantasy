import { FANTASY_TEAMS, DRIVERS, CONSTRUCTORS } from '../data'
import { getConstructorPairs } from '../utils'

export default function Teams({ standings }) {
  // Order teams by standings position
  const teamOrder = standings.map(s => s.key)

  return (
    <div className="animate-in">
      <h1 className="page-title">Fantasy Teams</h1>
      <div className="teams-grid">
        {teamOrder.map(teamKey => {
          const team = FANTASY_TEAMS[teamKey]
          const standing = standings.find(s => s.key === teamKey)
          const pairs = getConstructorPairs(team.drivers)

          return (
            <div key={teamKey} className="team-card" style={{ '--card-color': team.color }}>
              <div className="team-card-header">
                <div className="team-owner">{team.name}</div>
                <div className="team-points-badge">
                  {standing?.totalPoints || 0}
                  <small>pts</small>
                </div>
              </div>
              <ul className="team-drivers-list">
                {team.drivers.map(driverKey => {
                  const driver = DRIVERS[driverKey]
                  const constructor = CONSTRUCTORS[driver?.constructor]
                  const driverPts = standing?.driverTotals?.[driverKey] || 0

                  return (
                    <li key={driverKey} className="team-driver-item">
                      <span className="driver-number">{driver?.number}</span>
                      <div className="driver-info">
                        <div className="driver-full-name">{driver?.name}</div>
                        <div className="driver-constructor">
                          <span
                            className="constructor-dot"
                            style={{ background: constructor?.color || '#666' }}
                          />
                          {constructor?.name}
                        </div>
                      </div>
                      <span className="driver-season-points">
                        {driverPts > 0 ? driverPts : '—'}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {/* Constructor Pairs */}
              {pairs.length > 0 && (
                <div>
                  {pairs.map(cKey => (
                    <div key={cKey} className="constructor-pair-badge">
                      {CONSTRUCTORS[cKey]?.name} — Full Constructor
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
