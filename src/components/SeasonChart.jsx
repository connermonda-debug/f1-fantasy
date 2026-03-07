import { useState, useMemo } from 'react'
import { CALENDAR } from '../data'

const CHART_PADDING = { top: 24, right: 24, bottom: 40, left: 48 }
const CHART_WIDTH = 800
const CHART_HEIGHT = 320

export default function SeasonChart({ standings }) {
  const [tooltip, setTooltip] = useState(null)

  const chartData = useMemo(() => {
    // Build cumulative points per team per round
    const series = standings.map(team => {
      let cumulative = 0
      const points = team.raceHistory.map(rh => {
        cumulative += rh.points
        return { round: rh.round, cumulative, racePoints: rh.points }
      })
      return {
        key: team.key,
        name: team.name,
        color: team.color,
        points,
      }
    })

    // Determine max values for scaling
    const maxPoints = Math.max(
      ...series.flatMap(s => s.points.map(p => p.cumulative)),
      1
    )

    const rounds = series[0]?.points.map(p => p.round) || []

    return { series, maxPoints, rounds }
  }, [standings])

  if (chartData.rounds.length === 0) return null

  const innerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom

  const xScale = (index) => CHART_PADDING.left + (index / Math.max(chartData.rounds.length - 1, 1)) * innerWidth
  const yScale = (value) => CHART_PADDING.top + innerHeight - (value / chartData.maxPoints) * innerHeight

  // Y-axis grid lines
  const yTicks = getYTicks(chartData.maxPoints)

  return (
    <div className="season-chart" style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="season-chart-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {yTicks.map(tick => (
          <g key={tick}>
            <line
              x1={CHART_PADDING.left}
              y1={yScale(tick)}
              x2={CHART_WIDTH - CHART_PADDING.right}
              y2={yScale(tick)}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="4,4"
            />
            <text
              x={CHART_PADDING.left - 8}
              y={yScale(tick) + 4}
              textAnchor="end"
              fill="rgba(255,255,255,0.3)"
              fontSize="10"
              fontFamily="'Titillium Web', sans-serif"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {chartData.rounds.map((round, i) => {
          const cal = CALENDAR.find(c => c.round === round)
          return (
            <text
              key={round}
              x={xScale(i)}
              y={CHART_HEIGHT - 8}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize="10"
              fontFamily="'Titillium Web', sans-serif"
            >
              R{round}
            </text>
          )
        })}

        {/* Lines + dots for each team */}
        {chartData.series.map(team => {
          if (team.points.length === 0) return null

          const pathPoints = team.points.map((p, i) => `${xScale(i)},${yScale(p.cumulative)}`).join(' ')

          return (
            <g key={team.key}>
              {/* Line */}
              <polyline
                points={pathPoints}
                fill="none"
                stroke={team.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${team.color}40)` }}
              />

              {/* Data points */}
              {team.points.map((p, i) => (
                <circle
                  key={i}
                  cx={xScale(i)}
                  cy={yScale(p.cumulative)}
                  r="4"
                  fill={team.color}
                  stroke="var(--f1-card)"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setTooltip({
                    x: xScale(i),
                    y: yScale(p.cumulative),
                    team: team.name,
                    color: team.color,
                    round: p.round,
                    cumulative: p.cumulative,
                    racePoints: p.racePoints,
                  })}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="chart-tooltip"
          style={{
            left: `${(tooltip.x / CHART_WIDTH) * 100}%`,
            top: `${(tooltip.y / CHART_HEIGHT) * 100}%`,
            borderColor: tooltip.color,
          }}
        >
          <div className="chart-tooltip-team" style={{ color: tooltip.color }}>{tooltip.team}</div>
          <div className="chart-tooltip-detail">R{tooltip.round}: {tooltip.cumulative} pts (+{tooltip.racePoints})</div>
        </div>
      )}

      {/* Legend */}
      <div className="chart-legend">
        {chartData.series.map(team => (
          <div key={team.key} className="chart-legend-item">
            <div className="chart-legend-dot" style={{ background: team.color }} />
            <span className="chart-legend-name">{team.name}</span>
            <span className="chart-legend-pts">{team.points[team.points.length - 1]?.cumulative || 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function getYTicks(maxValue) {
  if (maxValue <= 10) return [0, 5, 10]
  if (maxValue <= 25) return [0, 10, 20, maxValue]
  if (maxValue <= 50) return [0, 10, 20, 30, 40, 50]
  if (maxValue <= 100) return [0, 25, 50, 75, 100]

  const step = Math.ceil(maxValue / 5 / 10) * 10
  const ticks = []
  for (let i = 0; i <= maxValue + step; i += step) {
    ticks.push(i)
    if (i >= maxValue) break
  }
  return ticks
}
