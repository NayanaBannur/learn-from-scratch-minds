import { useEffect, useState } from 'react'

// Whether the topic sidebar is collapsed to a slim rail. Persisted so a
// reader's choice survives reloads, mirroring useTheme's storage pattern.
const KEY = 'lfs:sidebarCollapsed'

function loadStored() {
  try {
    return localStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(loadStored)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(collapsed))
    } catch {
      /* storage full / unavailable */
    }
  }, [collapsed])

  return [collapsed, setCollapsed]
}
