import { useState, useMemo } from 'react'
import { RESULTS, CALENDAR } from './data'
import { calculateStandings } from './utils'
import Standings from './components/Standings'
import RaceView from './components/RaceView'
import Teams from './components/Teams'
import Calendar from './components/Calendar'
import Rules from './components/Rules'

const TABS = [
  { key: 'standings', label: 'Standings' },
  { key: 'races', label: 'Races' },
  { key: 'teams', label: 'Teams' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'rules', label: 'Rules' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('standings')
  const standings = useMemo(() => calculateStandings(), [])

  const renderView = () => {
    switch (activeTab) {
      case 'standings': return <Standings standings={standings} />
      case 'races':     return <RaceView standings={standings} />
      case 'teams':     return <Teams standings={standings} />
      case 'calendar':  return <Calendar />
      case 'rules':     return <Rules />
      default:          return <Standings standings={standings} />
    }
  }

  return (
    <>
      <div className="f1-stripe" />
      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="header-logo">
              <span>F1</span> Fantasy League
            </div>
            <span className="header-season">2026 Season</span>
            {RESULTS.length > 0 && (
              <span className="header-season">
                {RESULTS.length}/{CALENDAR.length} Races
              </span>
            )}
          </div>
          <nav className="nav">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`nav-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="main">
        {renderView()}
      </main>
    </>
  )
}
