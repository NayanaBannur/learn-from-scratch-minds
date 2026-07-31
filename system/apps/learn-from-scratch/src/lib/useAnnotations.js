import { useCallback, useEffect, useRef, useState } from 'react'

// Persisted annotation store for a topic. Annotations are saved to
// `annotations.json` *alongside the topic's content* (written by the dev-server
// middleware in vite.config.js). localStorage is a fallback for when that
// endpoint isn't available (e.g. a static production build).
//
// Each annotation: { id, sectionId, x, y, text, createdAt } where x/y are
// fractional offsets (0..1) relative to the *section* element it was placed in
// (sectionId is that element's DOM id, e.g. "sec-intro" or "references"). This
// anchors a bubble to its section, so it only shows while that section is on
// screen and keeps its spot regardless of the content's rendered pixel width.
// (Legacy annotations saved before this had no sectionId; they fall back to the
// topic's first section — see AnnotationLayer.)
const KEY_PREFIX = 'lfs:annotations:'

const storageKey = (topicId) => KEY_PREFIX + topicId

function parseList(raw) {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function loadLocal(topicId) {
  try {
    const raw = localStorage.getItem(storageKey(topicId))
    return raw ? parseList(raw) : []
  } catch {
    return []
  }
}

// `topic` is the loaded topic object: we use topic.dir as the stable key and
// topic.annotationsRaw as the file contents captured at build/dev start.
export function useAnnotations(topic) {
  const topicId = topic.dir
  // Seed from the file (preferred) and fall back to localStorage.
  const [annotations, setAnnotations] = useState(() =>
    topic.annotationsRaw ? parseList(topic.annotationsRaw) : loadLocal(topicId)
  )
  // Skip the very first persist so we don't immediately re-write the seed.
  const hydrated = useRef(false)

  // Re-seed when switching topics (TopicView is keyed by dir, so mostly a guard).
  useEffect(() => {
    hydrated.current = false
    setAnnotations(topic.annotationsRaw ? parseList(topic.annotationsRaw) : loadLocal(topicId))
    // Pull the freshest copy from the persistence endpoint if it's reachable.
    // Relative URL so it resolves under the app's <base> when served behind the
    // reverse proxy (/service/learn-from-scratch/), and at the root in dev.
    let cancelled = false
    fetch(`./__annotations?topic=${encodeURIComponent(topicId)}`)
      .then((r) => (r.ok ? r.text() : null))
      .then((raw) => {
        if (!cancelled && raw != null) setAnnotations(parseList(raw))
      })
      .catch(() => {
        /* endpoint absent (prod build) — keep seeded value */
      })
    return () => {
      cancelled = true
    }
  }, [topicId, topic.annotationsRaw])

  // Persist on change: write to the file via the persistence endpoint, mirror to
  // localStorage as a fallback.
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    const json = JSON.stringify(annotations)
    try {
      localStorage.setItem(storageKey(topicId), json)
    } catch {
      /* storage full / unavailable */
    }
    fetch(`./__annotations?topic=${encodeURIComponent(topicId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
    }).catch(() => {
      /* endpoint absent — localStorage already holds the data */
    })
  }, [topicId, annotations])

  const add = useCallback((sectionId, x, y, text) => {
    const ann = {
      id: `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      sectionId,
      x,
      y,
      text,
      createdAt: Date.now(),
    }
    setAnnotations((prev) => [...prev, ann])
    return ann.id
  }, [])

  const update = useCallback((id, text) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, text } : a)))
  }, [])

  const remove = useCallback((id) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return { annotations, add, update, remove }
}
