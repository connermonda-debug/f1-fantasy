// F1 Fantasy — Canvas API share card generator
// Generates a styled PNG image of race results for sharing

import { DRIVERS, FANTASY_TEAMS, CONSTRUCTORS, CALENDAR } from '../data'

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1080

/**
 * Generate a shareable race card as a PNG blob
 * @param {number} round - Race round number
 * @param {Object} teamResults - { teamKey: { totalPoints, driverResults } }
 * @returns {Promise<Blob>} PNG image blob
 */
export async function generateShareCard(round, teamResults) {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')

  const cal = CALENDAR.find(c => c.round === round)

  // Background
  ctx.fillStyle = '#0F0F17'
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // Top red stripe
  ctx.fillStyle = '#E10600'
  ctx.fillRect(0, 0, CARD_WIDTH, 6)

  // Header section
  ctx.fillStyle = '#15151E'
  ctx.fillRect(0, 6, CARD_WIDTH, 160)

  // F1 Fantasy title
  ctx.font = 'bold 28px "Titillium Web", "Helvetica Neue", Arial, sans-serif'
  ctx.fillStyle = '#E10600'
  ctx.fillText('F1', 48, 60)
  const f1Width = ctx.measureText('F1').width
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(' Fantasy League', 48 + f1Width, 60)

  // Race name
  ctx.font = 'bold 42px "Titillium Web", "Helvetica Neue", Arial, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(cal?.name || `Round ${round}`, 48, 115)

  // Circuit + date
  ctx.font = '18px "Titillium Web", "Helvetica Neue", Arial, sans-serif'
  ctx.fillStyle = '#9CA3AF'
  const dateStr = cal ? formatCardDate(cal.date) : ''
  ctx.fillText(`${cal?.circuit || ''} — ${cal?.location || ''} — ${dateStr}`, 48, 148)

  // Team results
  const sortedTeams = Object.entries(teamResults)
    .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)

  const cardTop = 190
  const cardHeight = 200
  const cardGap = 16
  const cardMargin = 36

  sortedTeams.forEach(([teamKey, result], index) => {
    const team = FANTASY_TEAMS[teamKey]
    const y = cardTop + index * (cardHeight + cardGap)

    // Team card background
    ctx.fillStyle = '#1E1E2E'
    roundRect(ctx, cardMargin, y, CARD_WIDTH - cardMargin * 2, cardHeight, 12)
    ctx.fill()

    // Team color bar
    ctx.fillStyle = team.color
    ctx.fillRect(cardMargin, y, 5, cardHeight)

    // Position badge
    ctx.font = 'bold 36px "Titillium Web", "Helvetica Neue", Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillText(`${index + 1}`, cardMargin + 20, y + 45)

    // Team name
    ctx.font = 'bold 26px "Titillium Web", "Helvetica Neue", Arial, sans-serif'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(team.name.toUpperCase(), cardMargin + 72, y + 42)

    // Total points
    ctx.font = 'bold 32px "Titillium Web", "Helvetica Neue", Arial, sans-serif'
    ctx.fillStyle = team.color
    const ptsText = `${result.totalPoints} PTS`
    const ptsWidth = ctx.measureText(ptsText).width
    ctx.fillText(ptsText, CARD_WIDTH - cardMargin - 24 - ptsWidth, y + 42)

    // Driver breakdown
    ctx.font = '16px "Titillium Web", "Helvetica Neue", Arial, sans-serif'
    const drivers = team.drivers
    const driverY = y + 72
    const driverLineHeight = 24

    drivers.forEach((driverKey, di) => {
      const driver = DRIVERS[driverKey]
      const dResult = result.driverResults[driverKey]
      const pts = dResult?.points || 0
      const constructorColor = CONSTRUCTORS[driver?.constructor]?.color || '#666'
      const lineY = driverY + di * driverLineHeight

      // Constructor color dot
      ctx.fillStyle = constructorColor
      ctx.beginPath()
      ctx.arc(cardMargin + 28, lineY - 4, 3, 0, Math.PI * 2)
      ctx.fill()

      // Driver abbreviation
      ctx.font = 'bold 14px "Titillium Web", "Helvetica Neue", Arial, sans-serif'
      ctx.fillStyle = '#9CA3AF'
      ctx.fillText(driver?.short || driverKey.toUpperCase().slice(0, 3), cardMargin + 42, lineY)

      // Driver full name
      ctx.font = '14px "Titillium Web", "Helvetica Neue", Arial, sans-serif'
      ctx.fillStyle = '#6B7280'
      ctx.fillText(driver?.name || driverKey, cardMargin + 86, lineY)

      // Points breakdown tags
      const bd = dResult?.breakdown || {}
      let tagX = cardMargin + 320
      const tags = []
      if (bd.qualifying) tags.push(`Q: P${bd.qualifying.position}`)
      if (bd.race) tags.push(`R: P${bd.race.position}`)
      if (bd.sprint) tags.push(`S: P${bd.sprint.position}`)
      if (bd.fastestLap) tags.push(`FL`)
      if (bd.driverOfTheDay) tags.push(`DOTD`)
      if (bd.dnf) tags.push(`DNF`)

      ctx.font = '12px "Titillium Web", "Helvetica Neue", Arial, sans-serif'
      tags.forEach(tag => {
        const isDNF = tag === 'DNF'
        const isBonus = tag === 'FL' || tag === 'DOTD'
        ctx.fillStyle = isDNF ? '#EF4444' : isBonus ? '#E10600' : '#6B7280'
        ctx.fillText(tag, tagX, lineY)
        tagX += ctx.measureText(tag).width + 12
      })

      // Points
      ctx.font = 'bold 16px "Titillium Web", "Helvetica Neue", Arial, sans-serif'
      ctx.fillStyle = pts > 0 ? '#FFFFFF' : pts < 0 ? '#EF4444' : '#6B7280'
      const ptStr = pts > 0 ? `+${pts}` : `${pts}`
      const ptWidth = ctx.measureText(ptStr).width
      ctx.fillText(ptStr, CARD_WIDTH - cardMargin - 24 - ptWidth, lineY)
    })
  })

  // Footer
  const footerY = CARD_HEIGHT - 48
  ctx.fillStyle = 'rgba(255,255,255,0.03)'
  ctx.fillRect(0, footerY - 10, CARD_WIDTH, 58)

  ctx.font = '14px "Titillium Web", "Helvetica Neue", Arial, sans-serif'
  ctx.fillStyle = '#6B7280'
  ctx.fillText('F1 Fantasy League 2026', 48, footerY + 18)

  // Sprint badge if applicable
  if (cal?.sprint) {
    ctx.font = 'bold 12px "Titillium Web", "Helvetica Neue", Arial, sans-serif'
    ctx.fillStyle = '#E10600'
    ctx.fillText('SPRINT WEEKEND', CARD_WIDTH - 200, footerY + 18)
  }

  // Convert to blob
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/png')
  })
}

/**
 * Share or download the race card
 */
export async function shareRaceCard(round, teamResults) {
  const blob = await generateShareCard(round, teamResults)
  const cal = CALENDAR.find(c => c.round === round)
  const filename = `f1-fantasy-r${round}-${cal?.location?.toLowerCase().replace(/\s+/g, '-') || 'race'}.png`

  // Try Web Share API first
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: 'image/png' })
    const shareData = { files: [file] }

    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        return
      } catch (e) {
        if (e.name === 'AbortError') return // User cancelled
      }
    }
  }

  // Fallback: download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Helper: rounded rectangle
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function formatCardDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
