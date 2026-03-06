import { CALENDAR, RESULTS } from '../data'

export default function Calendar() {
  const completedRounds = new Set(RESULTS.map(r => r.round))
  const today = new Date()

  // Find the next upcoming race
  let nextRound = null
  for (const race of CALENDAR) {
    if (!completedRounds.has(race.round)) {
      const raceDate = new Date(race.date + 'T00:00:00')
      if (raceDate >= today || !nextRound) {
        nextRound = race.round
        break
      }
    }
  }

  return (
    <div className="animate-in">
      <h1 className="page-title">2026 Race Calendar</h1>
      <div className="calendar-list">
        {CALENDAR.map(race => {
          const isCompleted = completedRounds.has(race.round)
          const isNext = race.round === nextRound

          let statusClass = 'upcoming'
          if (isCompleted) statusClass = 'completed'
          else if (isNext) statusClass = 'next-race'

          return (
            <div key={race.round} className={`calendar-race ${statusClass}`}>
              <span className="calendar-round">R{race.round}</span>
              <div className="calendar-info">
                <div className="calendar-name">{race.name}</div>
                <div className="calendar-location">{race.circuit}</div>
              </div>
              <span className="calendar-date">{formatDate(race.date)}</span>
              {race.sprint && <span className="calendar-sprint-tag">Sprint</span>}
              {isCompleted && <span className="calendar-status done">Complete</span>}
              {isNext && <span className="calendar-status next">Next Up</span>}
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
