import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// Overlay rendered on top of .content while annotation mode is on (or whenever
// there are saved annotations). Each bubble is anchored to the *section* it was
// placed in: its fractional (x,y) is relative to that section's element, and it
// only renders while that section is on screen. This keeps an annotation on its
// own page — only one section is on screen at a time, so without this anchoring
// every annotation would reappear on every level.
//
// Props:
//   contentRef     – ref to the .content element (the positioning frame)
//   active         – annotation mode on/off (only then can you add new ones)
//   level          – current slider level; passed only so positions recompute
//                    when the visible section swaps
//   firstSectionId – DOM id of the topic's first section, used to anchor legacy
//                    annotations that were saved without a sectionId
//   annotations / add / update / remove – from useAnnotations
export default function AnnotationLayer({
  contentRef,
  active,
  level,
  firstSectionId,
  annotations,
  add,
  update,
  remove,
}) {
  // A new, not-yet-saved annotation being composed: { sectionId, x, y }.
  const [draft, setDraft] = useState(null)
  // Which saved annotation is expanded into a card (only one at a time).
  const [openId, setOpenId] = useState(null)
  // Pixel placements (relative to .content) for the annotations whose section is
  // currently rendered, plus the draft. Recomputed from the live DOM after every
  // layout change so positions track section offsets and content resizes.
  const [layout, setLayout] = useState({ pins: [], draftPos: null })

  // Capture clicks on the content area to drop a new annotation. We attach the
  // listener to .content itself so that, with mode OFF, links/diagrams behave
  // exactly as before (this effect only runs while active).
  useEffect(() => {
    const content = contentRef.current
    if (!active || !content) return

    const onClick = (e) => {
      // Ignore clicks that originate inside the overlay (bubbles, popovers).
      if (e.target.closest('.ann-overlay')) return
      // Anchor to the section (or references footer) the click landed in.
      const anchor = e.target.closest('.section, .sources')
      if (!anchor || !anchor.id) return
      const rect = anchor.getBoundingClientRect()
      const x = clamp01((e.clientX - rect.left) / rect.width)
      const y = clamp01((e.clientY - rect.top) / rect.height)
      setOpenId(null)
      setDraft({ sectionId: anchor.id, x, y })
    }

    content.addEventListener('click', onClick)
    return () => content.removeEventListener('click', onClick)
  }, [active, contentRef])

  // Resolve an annotation's section to a pixel offset within .content, or null
  // when that section isn't currently rendered (so the bubble stays hidden).
  const recompute = useCallback(() => {
    const content = contentRef.current
    if (!content) {
      setLayout({ pins: [], draftPos: null })
      return
    }
    const place = (sectionId, x, y) => {
      // Legacy annotations have no sectionId — anchor them to the first section.
      const id = sectionId || firstSectionId
      const el = id ? document.getElementById(id) : null
      if (!el || !content.contains(el)) return null
      return {
        left: Math.round(el.offsetLeft + x * el.offsetWidth),
        top: Math.round(el.offsetTop + y * el.offsetHeight),
      }
    }
    const pins = []
    annotations.forEach((a, i) => {
      const pos = place(a.sectionId, a.x, a.y)
      if (pos) pins.push({ ann: a, index: i + 1, ...pos })
    })
    const draftPos = draft ? place(draft.sectionId, draft.x, draft.y) : null
    setLayout({ pins, draftPos })
  }, [annotations, draft, firstSectionId, contentRef])

  // Recompute after each commit that can move sections (level change, toggling
  // annotation mode) and whenever the content box resizes (lazy diagrams, window).
  useLayoutEffect(() => {
    recompute()
  }, [recompute, level, active])

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    const ro = new ResizeObserver(() => recompute())
    ro.observe(content)
    return () => ro.disconnect()
  }, [contentRef, recompute])

  const saveDraft = (text) => {
    const trimmed = text.trim()
    if (trimmed && draft) add(draft.sectionId, draft.x, draft.y, trimmed)
    setDraft(null)
  }

  return (
    <div className="ann-overlay">
      {layout.pins.map(({ ann, index, left, top }) => (
        <Bubble
          key={ann.id}
          index={index}
          ann={ann}
          left={left}
          top={top}
          open={openId === ann.id}
          onToggle={() => {
            setDraft(null)
            setOpenId((cur) => (cur === ann.id ? null : ann.id))
          }}
          onClose={() => setOpenId(null)}
          onSave={(text) => {
            update(ann.id, text)
            setOpenId(null)
          }}
          onDelete={() => {
            remove(ann.id)
            setOpenId(null)
          }}
        />
      ))}

      {draft && layout.draftPos && (
        <Popover
          left={layout.draftPos.left}
          top={layout.draftPos.top}
          onSave={saveDraft}
          onCancel={() => setDraft(null)}
        />
      )}
    </div>
  )
}

// A collapsed pin that expands into a card with the comment + edit/delete.
function Bubble({ index, ann, left, top, open, onToggle, onClose, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)

  if (open) {
    return (
      <div className="ann-card" style={{ left, top }}>
        {editing ? (
          <Editor
            initial={ann.text}
            saveLabel="Save"
            onSave={(text) => {
              if (text.trim()) onSave(text.trim())
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <p className="ann-card-text">{ann.text}</p>
            <div className="ann-card-actions">
              <button type="button" className="ann-link" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button type="button" className="ann-link ann-danger" onClick={onDelete}>
                Delete
              </button>
              <button type="button" className="ann-link ann-close" aria-label="Close" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="ann-pin"
      style={{ left, top }}
      title={ann.text}
      aria-label={`Annotation ${index}: ${ann.text}`}
      onClick={onToggle}
    >
      {index}
    </button>
  )
}

// Popover for composing a brand-new annotation, with a small pointer tail.
function Popover({ left, top, onSave, onCancel }) {
  return (
    <div className="ann-popover" style={{ left, top }}>
      <span className="ann-tail" aria-hidden="true" />
      <Editor initial="" saveLabel="Save" onSave={onSave} onCancel={onCancel} />
    </div>
  )
}

// Shared textarea editor: Enter saves, Shift+Enter inserts a newline, Escape
// cancels. Autofocuses on open for keyboard-first use.
function Editor({ initial, saveLabel, onSave, onCancel }) {
  const [text, setText] = useState(initial)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSave(text)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div className="ann-editor">
      <textarea
        ref={ref}
        className="ann-textarea"
        value={text}
        placeholder="Add a comment…"
        rows={3}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="ann-editor-actions">
        <button type="button" className="ann-link" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="ann-save" onClick={() => onSave(text)} disabled={!text.trim()}>
          {saveLabel}
        </button>
      </div>
    </div>
  )
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n))
}
