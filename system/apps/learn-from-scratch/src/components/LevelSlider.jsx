import React, { useEffect, useRef } from 'react'

// How many ticks the rail shows at once before it starts windowing. With more
// levels than this, the rail shows a sliding window that follows the active
// level (keeping LEAD steps of context above it) and fades at the edges that
// have hidden steps — so the rail never outgrows the viewport or forces the
// page to scroll.
const VISIBLE_TICKS = 10
const LEAD = 4

// Vertical detail slider on the left. Each notch is a curriculum step (one
// section). Dragging or clicking sets the level; the content scrolls to match
// (handled by TopicView). Level 1 = start, last = end point.
export default function LevelSlider({ levels, level, setLevel }) {
  const max = levels.length
  const railRef = useRef(null)
  const dragging = useRef(false)

  // Sliding window of levels to render. When everything fits, show all.
  const windowed = max > VISIBLE_TICKS
  const start = windowed
    ? Math.min(Math.max(1, level - LEAD), max - VISIBLE_TICKS + 1)
    : 1
  const end = windowed ? start + VISIBLE_TICKS - 1 : max
  const moreAbove = start > 1
  const moreBelow = end < max

  const levelFromY = (clientY) => {
    const rail = railRef.current
    if (!rail) return
    const ticks = [...rail.querySelectorAll('.vtick')]
    let best = level
    let bestDist = Infinity
    ticks.forEach((t) => {
      const r = t.getBoundingClientRect()
      const cy = r.top + r.height / 2
      const d = Math.abs(cy - clientY)
      if (d < bestDist) {
        bestDist = d
        best = Number(t.dataset.level)
      }
    })
    if (best !== level) setLevel(best)
  }

  const onDown = (e) => {
    dragging.current = true
    e.currentTarget.setPointerCapture?.(e.pointerId)
    levelFromY(e.clientY)
  }
  const onMove = (e) => dragging.current && levelFromY(e.clientY)
  const stop = () => (dragging.current = false)

  // Wheel over the rail scrolls through levels (window follows) instead of
  // scrolling the page — no scrollbar shown. Accumulate small trackpad deltas
  // so one "notch" of scrolling moves one level. Attached natively with
  // { passive: false } so preventDefault actually suppresses the page scroll.
  const wheelAcc = useRef(0)
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return undefined
    const onWheel = (e) => {
      e.preventDefault()
      wheelAcc.current += e.deltaY
      const THRESH = 24
      let next = level
      while (wheelAcc.current >= THRESH) {
        next = Math.min(max, next + 1)
        wheelAcc.current -= THRESH
      }
      while (wheelAcc.current <= -THRESH) {
        next = Math.max(1, next - 1)
        wheelAcc.current += THRESH
      }
      if (next !== level) setLevel(next)
    }
    rail.addEventListener('wheel', onWheel, { passive: false })
    return () => rail.removeEventListener('wheel', onWheel)
  }, [level, max, setLevel])

  // Arrow-key navigation, available anywhere on the page (no need to click the
  // slider first). Down/Right step to the next (deeper) level, Up/Left to the
  // previous one; Home/End jump to the ends, PageUp/Down move by 3. We ignore
  // keys while the user is typing in a field or operating another control (e.g.
  // a text input, the rank-explorer's range slider), and preventDefault so the
  // page doesn't also scroll.
  useEffect(() => {
    const clamp = (n) => Math.min(max, Math.max(1, n))
    const onKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return
      let next = level
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          next = clamp(level + 1)
          break
        case 'ArrowUp':
        case 'ArrowLeft':
          next = clamp(level - 1)
          break
        case 'Home':
          next = 1
          break
        case 'End':
          next = max
          break
        case 'PageDown':
          next = clamp(level + 3)
          break
        case 'PageUp':
          next = clamp(level - 3)
          break
        default:
          return
      }
      e.preventDefault()
      if (next !== level) setLevel(next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [level, max, setLevel])

  return (
    <div className="vslider">
      <div className="vslider-title">Detail</div>
      <div
        className={`vrail${moreAbove ? ' fade-top' : ''}${moreBelow ? ' fade-bottom' : ''}`}
        ref={railRef}
        role="slider"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label="Detail level"
        aria-valuemin={1}
        aria-valuemax={max}
        aria-valuenow={level}
        aria-valuetext={`Level ${level}: ${levels[level - 1]?.caption || ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={stop}
        onPointerCancel={stop}
      >
        <div className="vrail-line" />
        <div
          className="vrail-fill"
          style={{ height: `${((level - start) / Math.max(1, end - start)) * 100}%` }}
        />
        {levels.slice(start - 1, end).map((lvl, i) => {
          const n = start + i
          const state = n < level ? 'past' : n === level ? 'current' : 'future'
          const extra = lvl.additionalReading
          return (
            <button
              key={n}
              type="button"
              tabIndex={-1}
              data-level={n}
              className={`vtick ${state}${extra ? ' extra' : ''}`}
              // Prevent the button from grabbing focus on click, which would
              // otherwise leave a focus outline lingering on the clicked tick.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setLevel(n)}
              title={`Level ${n}: ${lvl.caption || ''}${extra ? ' (additional reading)' : ''}`}
            >
              <span className="vdot" />
              <span className="vcap">
                {lvl.caption || `Level ${n}`}
                {extra && <span className="vtag">additional reading</span>}
              </span>
            </button>
          )
        })}
      </div>
      <div className="vslider-count">
        {level} / {max}
      </div>
    </div>
  )
}
