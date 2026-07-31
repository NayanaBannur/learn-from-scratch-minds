import React, { useEffect, useRef, useState } from 'react'
import { allTagsOf, tagKey } from '../lib/tags.js'

// Always-available tag editor shown in the topic header. View, add, edit, and
// delete a topic's tags at any time. Each change calls onChange(nextTags) with
// the full list; persistence + de-duplication happen upstream (useTags).
//
// Props:
//   tags      – current tags for this topic (string[])
//   allTags   – { [dir]: string[] } across all topics, for input suggestions
//   onChange  – (nextTags: string[]) => void
export default function TagEditor({ tags, allTags, onChange }) {
  // null = not editing; a number = editing that chip; 'new' = adding one.
  const [editing, setEditing] = useState(null)
  const suggestions = allTagsOf(allTags).filter((s) => !tags.some((t) => tagKey(t) === tagKey(s)))

  const commit = (index, value) => {
    const text = value.trim()
    if (index === 'new') {
      if (text) onChange([...tags, text])
    } else {
      const next = tags.slice()
      if (text) next[index] = text
      else next.splice(index, 1) // cleared an existing tag → delete it
      onChange(next)
    }
    setEditing(null)
  }

  const remove = (index) => onChange(tags.filter((_, i) => i !== index))

  return (
    <div className="tag-editor" role="group" aria-label="Tags">
      <span className="tag-editor-label">Tags</span>
      {tags.map((t, i) =>
        editing === i ? (
          <TagInput
            key={`edit-${i}`}
            initial={t}
            suggestions={suggestions}
            onCommit={(v) => commit(i, v)}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <span key={`chip-${i}`} className="tag-chip">
            <button
              type="button"
              className="tag-chip-label"
              title="Edit tag"
              onClick={() => setEditing(i)}
            >
              {t}
            </button>
            <button
              type="button"
              className="tag-chip-remove"
              aria-label={`Remove tag ${t}`}
              onClick={() => remove(i)}
            >
              ×
            </button>
          </span>
        )
      )}

      {editing === 'new' ? (
        <TagInput
          initial=""
          suggestions={suggestions}
          onCommit={(v) => commit('new', v)}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button type="button" className="tag-add" onClick={() => setEditing('new')}>
          + Add tag
        </button>
      )}
    </div>
  )
}

// Inline input for adding or editing a tag. Enter (or comma) commits, Escape
// cancels, blur commits whatever's there. Existing tags (alphabetical) are
// offered as wrapping pills in a dropdown — typing narrows them.
function TagInput({ initial, suggestions, onCommit, onCancel }) {
  const [value, setValue] = useState(initial)
  const ref = useRef(null)
  // Guard so the click/Enter/blur paths can't each fire a commit (or a commit
  // after a cancel) — only the first settle wins.
  const settled = useRef(false)
  const commit = (val) => {
    if (settled.current) return
    settled.current = true
    onCommit(val)
  }
  const cancel = () => {
    if (settled.current) return
    settled.current = true
    onCancel()
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  const q = value.trim().toLowerCase()
  const matches = suggestions.filter((s) => !q || s.toLowerCase().includes(q))

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(value)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  return (
    <span className="tag-input-wrap">
      <input
        ref={ref}
        className="tag-input"
        value={value}
        placeholder="tag…"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        // Delay so a pill mousedown lands before blur commits the typed text.
        onBlur={() => setTimeout(() => commit(value), 120)}
        size={Math.max(6, value.length + 1)}
      />
      {matches.length > 0 && (
        <div className="tag-suggest-menu">
          {matches.map((s) => (
            <button
              key={s}
              type="button"
              className="tag-suggest-option"
              // onMouseDown (not onClick) so it fires before the input blur.
              onMouseDown={(e) => {
                e.preventDefault()
                commit(s)
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
