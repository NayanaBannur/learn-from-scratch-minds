import { useCallback, useMemo, useState } from 'react'
import { normalizeTags } from './tags.js'

// Per-topic tag store, held at the app level so the sidebar filter and the
// header editor share one source of truth and stay in sync as tags change.
//
// Tags are seeded from each topic's manifest (topic.tags). Edits update state
// immediately and are persisted to manifest.json via the /__tags dev endpoint,
// mirrored to localStorage so a static production build still remembers them.
const KEY_PREFIX = 'lfs:tags:'
const storageKey = (dir) => KEY_PREFIX + dir

function loadLocal(dir) {
  try {
    const raw = localStorage.getItem(storageKey(dir))
    return raw ? normalizeTags(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function useTags(topics) {
  // { [dir]: string[] } — prefer a locally-saved override, else the manifest.
  const [tagsByTopic, setTagsByTopic] = useState(() => {
    const init = {}
    for (const [dir, topic] of Object.entries(topics)) {
      init[dir] = loadLocal(dir) ?? topic.tags
    }
    return init
  })

  const setTopicTags = useCallback((dir, nextRaw) => {
    const next = normalizeTags(nextRaw)
    setTagsByTopic((prev) => ({ ...prev, [dir]: next }))
    try {
      localStorage.setItem(storageKey(dir), JSON.stringify(next))
    } catch {
      /* storage full / unavailable */
    }
    // Relative URL so it resolves under the app's <base> behind the reverse proxy
    // (/service/learn-from-scratch/) and at the root in dev.
    fetch(`./__tags?topic=${encodeURIComponent(dir)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: next }),
    }).catch(() => {
      /* endpoint unreachable — localStorage already holds the data */
    })
  }, [])

  return useMemo(() => ({ tagsByTopic, setTopicTags }), [tagsByTopic, setTopicTags])
}
