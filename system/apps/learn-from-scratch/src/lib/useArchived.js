import { useCallback, useMemo, useState } from 'react'

// Per-slide archived flag, held at the app level so the sidebar tree and the
// header toggle share one source of truth. Archived slides are relocated under
// the "Archive" branch in the sidebar (see buildTree) without their content
// folder moving on disk.
//
// Seeded from each slide's manifest (topic.archived). Toggling updates state
// immediately and persists to manifest.json via the /__archived dev endpoint,
// mirrored to localStorage so a static production build still remembers it.
const KEY_PREFIX = 'lfs:archived:'
const storageKey = (dir) => KEY_PREFIX + dir

function loadLocal(dir) {
  try {
    const raw = localStorage.getItem(storageKey(dir))
    return raw == null ? null : raw === 'true'
  } catch {
    return null
  }
}

export function useArchived(topics) {
  // { [dir]: boolean } — prefer a locally-saved override, else the manifest.
  const [archivedByTopic, setArchivedByTopic] = useState(() => {
    const init = {}
    for (const [dir, topic] of Object.entries(topics)) {
      init[dir] = loadLocal(dir) ?? topic.archived
    }
    return init
  })

  const setTopicArchived = useCallback((dir, nextRaw) => {
    const next = !!nextRaw
    setArchivedByTopic((prev) => ({ ...prev, [dir]: next }))
    try {
      localStorage.setItem(storageKey(dir), String(next))
    } catch {
      /* storage full / unavailable */
    }
    // Relative URL so it resolves under the app's <base> behind the reverse proxy
    // (/service/learn-from-scratch/) and at the root in dev.
    fetch(`./__archived?topic=${encodeURIComponent(dir)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: next }),
    }).catch(() => {
      /* endpoint unreachable — localStorage already holds the data */
    })
  }, [])

  return useMemo(
    () => ({ archivedByTopic, setTopicArchived }),
    [archivedByTopic, setTopicArchived],
  )
}
