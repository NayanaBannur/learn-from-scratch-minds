import React, { Suspense, useMemo, useState } from 'react'

// Dispatches a ```diagram fenced block (parsed JSON spec) to a renderer.
// Built-in reusable types: "flow" (interactive), "svg" (asset passthrough).
// Per-topic custom diagrams: type "component" loads assets/*.jsx lazily.
export default function Diagram({ spec, topic }) {
  if (!spec || !spec.type) return null
  switch (spec.type) {
    case 'flow':
      return <FlowDiagram spec={spec} />
    case 'svg':
      return <SvgDiagram spec={spec} topic={topic} />
    case 'component':
      return <ComponentDiagram spec={spec} topic={topic} />
    default:
      return <pre className="diagram-error">Unknown diagram type: {spec.type}</pre>
  }
}

// Interactive node/edge flow. Click a node to highlight it and read its detail.
// Nodes: { id, label, detail? }. Edges: { from, to, label? }.
// Layout: explicit {x,y} (0..1) if given, else auto rows.
function FlowDiagram({ spec }) {
  const { nodes = [], edges = [], title, direction = 'row' } = spec
  const [selected, setSelected] = useState(null)

  const placed = useMemo(() => {
    const n = nodes.length || 1
    return nodes.map((node, i) => {
      // slot-based centering keeps a half-node margin at each end so wide
      // node boxes never clip against the viewBox edges
      const along = (i + 0.5) / n
      return {
        ...node,
        x: node.x ?? (direction === 'row' ? along : 0.5),
        y: node.y ?? (direction === 'row' ? 0.5 : along),
      }
    })
  }, [nodes, direction])

  // size the canvas to the node count so boxes get room instead of clipping
  const W = direction === 'row' ? Math.max(720, nodes.length * 158) : 720
  const H = direction === 'row' ? 220 : Math.max(220, nodes.length * 90)
  const byId = Object.fromEntries(placed.map((p) => [p.id, p]))
  const sel = selected && byId[selected]

  return (
    <figure className="diagram flow">
      {title && <figcaption>{title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} className="flow-svg" role="img">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="arrow-head" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = byId[e.from]
          const b = byId[e.to]
          if (!a || !b) return null
          const x1 = a.x * W
          const y1 = a.y * H
          const x2 = b.x * W
          const y2 = b.y * H
          const mx = (x1 + x2) / 2
          const my = (y1 + y2) / 2
          const active = selected && (e.from === selected || e.to === selected)
          return (
            <g key={i} className={active ? 'edge active' : 'edge'}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} markerEnd="url(#arrow)" />
              {e.label && (
                <text x={mx} y={my - 6} className="edge-label" textAnchor="middle">
                  {e.label}
                </text>
              )}
            </g>
          )
        })}
        {placed.map((node) => {
          const cx = node.x * W
          const cy = node.y * H
          const active = selected === node.id
          return (
            <g
              key={node.id}
              className={active ? 'node active' : 'node'}
              transform={`translate(${cx},${cy})`}
              onClick={() => setSelected(active ? null : node.id)}
            >
              <rect x={-72} y={-26} width={144} height={52} rx={10} />
              <text textAnchor="middle" dominantBaseline="middle">
                {node.label}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="flow-detail">
        {/* Hidden "ghost" copies of every possible message overlap the visible
            one in a single grid cell, so the box reserves the height of the
            tallest detail and never resizes as you click between nodes. */}
        {placed.map((n) => (
          <p key={n.id} className="flow-detail-ghost" aria-hidden="true">
            <strong>{n.label}.</strong> {n.detail || 'No further detail.'}
          </p>
        ))}
        <p className="flow-detail-ghost" aria-hidden="true">Click a step to see what it does.</p>
        <p className="flow-detail-live">
          {sel ? (
            <>
              <strong>{sel.label}.</strong> {sel.detail || 'No further detail.'}
            </>
          ) : (
            <span className="muted">Click a step to see what it does.</span>
          )}
        </p>
      </div>
    </figure>
  )
}

function SvgDiagram({ spec, topic }) {
  const raw = topic?.resolveSvg?.(spec.src)
  if (!raw) return <pre className="diagram-error">Missing SVG asset: {spec.src}</pre>
  return (
    <figure className="diagram svg-diagram">
      {spec.title && <figcaption>{spec.title}</figcaption>}
      <div className="svg-wrap" dangerouslySetInnerHTML={{ __html: raw }} />
    </figure>
  )
}

function ComponentDiagram({ spec, topic }) {
  const loader = topic?.resolveComponent?.(spec.module)
  const Lazy = useMemo(() => (loader ? React.lazy(loader) : null), [loader])
  if (!Lazy) return <pre className="diagram-error">Missing component: {spec.module}</pre>
  return (
    <figure className="diagram component-diagram">
      {spec.title && <figcaption>{spec.title}</figcaption>}
      <Suspense fallback={<p className="muted">Loading diagram…</p>}>
        <Lazy {...(spec.props || {})} />
      </Suspense>
    </figure>
  )
}
