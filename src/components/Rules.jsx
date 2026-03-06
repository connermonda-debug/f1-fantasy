import { SCORING } from '../data'

export default function Rules() {
  return (
    <div className="animate-in">
      <h1 className="page-title">Scoring Rules</h1>
      <div className="rules-grid">

        {/* Qualifying */}
        <div className="rules-card">
          <h3>Qualifying</h3>
          <table className="rules-table">
            <tbody>
              {Object.entries(SCORING.qualifying).map(([pos, pts]) => (
                <tr key={pos}>
                  <td>P{pos}</td>
                  <td>+{pts} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Race */}
        <div className="rules-card">
          <h3>Race (F1 Points)</h3>
          <table className="rules-table">
            <tbody>
              {Object.entries(SCORING.race).map(([pos, pts]) => (
                <tr key={pos}>
                  <td>P{pos}</td>
                  <td>+{pts} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sprint */}
        <div className="rules-card">
          <h3>Sprint (F1 Points)</h3>
          <table className="rules-table">
            <tbody>
              {Object.entries(SCORING.sprint).map(([pos, pts]) => (
                <tr key={pos}>
                  <td>P{pos}</td>
                  <td>+{pts} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bonuses */}
        <div className="rules-card">
          <h3>Driver Bonuses</h3>
          <table className="rules-table">
            <tbody>
              <tr><td>Fastest Lap</td><td>+{SCORING.fastestLap} pts</td></tr>
              <tr><td>Driver of the Day</td><td>+{SCORING.driverOfTheDay} pts</td></tr>
              <tr><td>DNF</td><td>{SCORING.dnf} pts</td></tr>
              <tr><td>Driver Champion</td><td>+{SCORING.driverChampion} pts</td></tr>
            </tbody>
          </table>
        </div>

        {/* Constructor */}
        <div className="rules-card">
          <h3>Constructor Bonuses</h3>
          <table className="rules-table">
            <tbody>
              <tr><td>Fastest Pit Stop</td><td>+{SCORING.fastestPitStop} pts</td></tr>
              <tr><td>Constructor Champion</td><td>+{SCORING.constructorChampion} pts</td></tr>
            </tbody>
          </table>
          <p className="rules-note">
            Must have both drivers from a constructor on your team to be awarded constructor points.
          </p>
        </div>

        {/* How it works */}
        <div className="rules-card">
          <h3>How It Works</h3>
          <table className="rules-table">
            <tbody>
              <tr><td colSpan="2" style={{ color: 'var(--text-primary)', fontWeight: 400 }}>
                Each team has 5 drivers. Points are accumulated across all race weekends throughout the season.
                Sprint weekends include an additional sprint race. The team with the most points at the end of the season wins.
              </td></tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
