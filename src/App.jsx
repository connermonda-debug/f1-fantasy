import { useState, useEffect, useMemo, useCallback } from 'react'
import { RESULTS, CALENDAR } from './data'
import { calculateStandings } from './utils'
import Standings from './components/Standings'
import RaceView from './components/RaceView'
import Teams from './components/Teams'
import Calendar from './components/Calendar'
import Rules from './components/Rules'
import Stats from './components/Stats'

const TABS = [
  { key: 'standings', label: 'Standings' },
  { key: 'races', label: 'Races' },
  { key: 'stats', label: 'Stats' },
  { key: 'teams', label: 'Teams' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'rules', label: 'Rules' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('standings')
  const standings = useMemo(() => calculateStandings(), [])

  // New results toast
  const [showToast, setShowToast] = useState(false)
  const [newRound, setNewRound] = useState(null)

  useEffect(() => {
    if (RESULTS.length === 0) return
    const lastSeen = parseInt(localStorage.getItem('f1fantasy_lastSeenRound') || '0')
    const currentMax = Math.max(...RESULTS.map(r => r.round))
    if (currentMax > lastSeen) {
      setNewRound(currentMax)
      setShowToast(true)
    }
  }, [])

  const dismissToast = useCallback(() => {
    setShowToast(false)
    setNewRound(prev => {
      if (prev) localStorage.setItem('f1fantasy_lastSeenRound', String(prev))
      return null
    })
  }, [])

  // Auto-dismiss toast after 8 seconds
  useEffect(() => {
    if (!showToast) return
    const timer = setTimeout(dismissToast, 8000)
    return () => clearTimeout(timer)
  }, [showToast, dismissToast])

  const renderView = () => {
    switch (activeTab) {
      case 'standings': return <Standings standings={standings} />
      case 'races':     return <RaceView standings={standings} />
      case 'stats':     return <Stats standings={standings} />
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
            <span className="header-season header-updated" title={`Built: ${__BUILD_TIME__}`}>
              Updated {formatUpdatedTime(__BUILD_TIME__)}
            </span>
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

      {/* New Results Toast */}
      {showToast && newRound && (
        <div className="toast-banner" onClick={dismissToast}>
          <div className="toast-inner">
            <span className="toast-icon">🏁</span>
            <span className="toast-text">
              New results! Round {newRound} — {CALENDAR.find(c => c.round === newRound)?.name || `Race ${newRound}`} is in.
            </span>
            <button className="toast-dismiss" onClick={(e) => { e.stopPropagation(); dismissToast() }}>✕</button>
          </div>
        </div>
      )}

      <main className="main">
        {renderView()}
      </main>
    </>
  )
}

function formatUpdatedTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const now = new Date()
  const diffMs = now - d
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHrs < 1) return 'just now'
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
