import { useEffect, useState } from 'react'

// Three states: 'light' | 'dark' force an explicit palette; 'system' (the
// default) defers to the OS-level prefers-color-scheme media query in
// styles.css. Only an explicit choice is persisted — 'system' clears the key
// so a change in OS setting keeps being picked up on future visits.
const KEY = 'lfs:theme'

function loadStored() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(loadStored)

  // Reflected onto <html data-theme>, which styles.css uses to override the
  // light-mode CSS variables regardless of OS setting.
  useEffect(() => {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
    try {
      if (theme === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, theme)
    } catch {
      /* storage full / unavailable */
    }
  }, [theme])

  return [theme, setTheme]
}
