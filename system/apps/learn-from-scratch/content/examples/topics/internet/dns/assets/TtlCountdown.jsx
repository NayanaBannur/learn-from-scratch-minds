import React, { useEffect, useRef, useState } from 'react'

// Interactive TTL trade-off demo. Two resolvers cache the SAME name, one with a
// low TTL and one with a high TTL, and both auto-refresh when their copy expires.
// The reader moves example.com to a new IP and watches the low-TTL resolver
// correct almost at once while the high-TTL one keeps serving the stale address —
// meanwhile a lookup counter shows the low-TTL resolver pays for that freshness
// with many more lookups. The whole thing resolves within the high TTL (a few
// seconds), so nobody waits on real-world minutes/hours.

const GREEN = '#2f6f4f'
const AMBER = '#b45309'
const MUTED = '#6b7280'
const LINE = '#e2e5ea'
const INK = '#1f2328'

const IPS = ['93.184.216.34', '104.18.22.7']

// Sped-up TTLs: the point lands in seconds, not minutes.
const LANES = [
  { id: 'low', name: 'Low TTL', ttl: 2 },
  { id: 'high', name: 'High TTL', ttl: 6 },
]

const TICK = 0.1 // seconds per tick

function freshLanes() {
  return LANES.map((l) => ({ ...l, servedIp: IPS[0], remaining: l.ttl, lookups: 1 }))
}

export default function TtlCountdown() {
  const [trueIp, setTrueIp] = useState(IPS[0])
  const [lanes, setLanes] = useState(freshLanes)
  const trueIpRef = useRef(IPS[0])
  const timer = useRef(null)

  const start = () => {
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      setLanes((prev) =>
        prev.map((l) => {
          let remaining = l.remaining - TICK
          let { servedIp, lookups } = l
          if (remaining <= 0) {
            // cache expired → resolver re-looks-up and gets the CURRENT true IP
            servedIp = trueIpRef.current
            lookups += 1
            remaining = l.ttl
          }
          return { ...l, remaining, servedIp, lookups }
        }),
      )
    }, TICK * 1000)
  }

  useEffect(() => {
    start()
    return () => clearInterval(timer.current)
  }, [])

  const moveServer = () => {
    const next = trueIpRef.current === IPS[0] ? IPS[1] : IPS[0]
    trueIpRef.current = next
    setTrueIp(next) // caches are untouched — they keep serving the old IP until expiry
  }

  const reset = () => {
    trueIpRef.current = IPS[0]
    setTrueIp(IPS[0])
    setLanes(freshLanes())
    start()
  }

  const btn = (bg, color, border) => ({
    padding: '7px 14px',
    borderRadius: 7,
    border: border || 'none',
    background: bg,
    color,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  })

  return (
    <div style={{ fontSize: 14, color: INK }}>
      {/* the real record, and the button that moves it */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          border: `1px solid ${LINE}`,
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 14,
        }}
      >
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: MUTED }}>example.com actually lives at </span>
          <strong style={{ color: INK }}>{trueIp}</strong>
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={moveServer} style={btn('#2563eb', '#fff')}>
            Move to a new server
          </button>
          <button onClick={reset} style={btn('#fff', MUTED, `1px solid ${LINE}`)}>
            Reset
          </button>
        </div>
      </div>

      {/* the two resolvers, side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {lanes.map((l) => {
          const stale = l.servedIp !== trueIp
          const pct = Math.max(0, (l.remaining / l.ttl) * 100)
          const color = stale ? AMBER : GREEN
          return (
            <div key={l.id} style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <strong>{l.name}</strong>
                <span style={{ fontSize: 12, color: MUTED }}>refreshes every {l.ttl}s</span>
              </div>

              <div style={{ fontVariantNumeric: 'tabular-nums', marginBottom: 8 }}>
                <span style={{ color: MUTED }}>serving </span>
                <strong style={{ color }}>{l.servedIp}</strong>{' '}
                <span style={{ color, fontSize: 12 }}>{stale ? '· stale' : '· fresh'}</span>
              </div>

              <div style={{ height: 10, background: '#eef0f3', borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, transition: `width ${TICK}s linear` }} />
              </div>

              <div style={{ fontSize: 13, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>
                lookups so far: <strong style={{ color: INK }}>{l.lookups}</strong>
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 12.5, color: MUTED, lineHeight: 1.5 }}>
        Move the server, then watch: the <strong style={{ color: GREEN }}>low-TTL</strong> resolver goes fresh again within
        seconds but looks up far more often; the <strong style={{ color: AMBER }}>high-TTL</strong> resolver keeps serving
        the old address until its copy expires. That is the speed-vs-freshness trade-off.
        <br />
        <span style={{ fontStyle: 'italic' }}>Sped up for the demo — real TTLs run from minutes to a day.</span>
      </p>
    </div>
  )
}
