import React, { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import TopicView from './components/TopicView.jsx'
import { loadTopics, buildTree } from './lib/content.js'
import { useTags } from './lib/useTags.js'
import { useArchived } from './lib/useArchived.js'
import { useTheme } from './lib/useTheme.js'
import { useSidebarCollapsed } from './lib/useSidebarCollapsed.js'

// The open topic and slider level live in the URL hash (e.g.
// "#%2Fcontent%2Fai%2Ftopics%2Flora::3"). This survives the full-reload that the
// dev server fires as content is edited — so when the learn-from-scratch agent
// writes a topic, you keep watching the same slide fill in instead of being
// bounced back to the landing page. No router needed; just location.hash.
function readHash() {
  const raw = (window.location.hash || '').replace(/^#/, '')
  if (!raw) return { dir: null, level: 1 }
  const [enc, lvl] = raw.split('::')
  let dir = null
  try {
    dir = decodeURIComponent(enc) || null
  } catch {
    dir = null
  }
  return { dir, level: Number(lvl) || 1 }
}

export default function App() {
  const topics = useMemo(() => loadTopics(), [])
  const hasTopics = Object.keys(topics).length > 0
  // Open topic + slider level, seeded from the URL hash (nothing selected → the
  // welcome landing). Lifting level out of TopicView lets it persist across reloads.
  const [route, setRoute] = useState(readHash)
  const { tagsByTopic, setTopicTags } = useTags(topics)
  const { archivedByTopic, setTopicArchived } = useArchived(topics)
  const [theme, setTheme] = useTheme()
  const [sidebarCollapsed, setSidebarCollapsed] = useSidebarCollapsed()
  // Rebuild the tree when archived state changes so toggling moves a slide in or
  // out of the Archive branch immediately.
  const tree = useMemo(() => buildTree(topics, archivedByTopic), [topics, archivedByTopic])

  // Mirror the route into the hash so a reload restores it. replaceState (not a
  // new hash assignment) keeps level changes out of the back-button history.
  useEffect(() => {
    const next = route.dir
      ? '#' + encodeURIComponent(route.dir) + (route.level > 1 ? '::' + route.level : '')
      : '#'
    if (window.location.hash !== next && !(next === '#' && !window.location.hash)) {
      window.history.replaceState(null, '', next)
    }
  }, [route])

  // Honour external hash changes (back/forward, manual edits).
  useEffect(() => {
    const onHash = () => setRoute(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const setSelected = (dir) => setRoute({ dir, level: 1 })
  const setLevel = (level) => setRoute((r) => ({ ...r, level }))

  const selected = route.dir && topics[route.dir] ? route.dir : null
  const topic = selected ? topics[selected] : null

  return (
    <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        tree={tree}
        topics={topics}
        selected={selected}
        onSelect={setSelected}
        tagsByTopic={tagsByTopic}
        theme={theme}
        setTheme={setTheme}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
      />
      {topic ? (
        // key resets the slider level when switching topics
        <TopicView
          key={topic.dir}
          topic={topic}
          level={route.level}
          setLevel={setLevel}
          tags={tagsByTopic[topic.dir] || []}
          allTags={tagsByTopic}
          onTagsChange={(next) => setTopicTags(topic.dir, next)}
          archived={archivedByTopic[topic.dir] ?? topic.archived}
          onArchivedChange={(next) => setTopicArchived(topic.dir, next)}
        />
      ) : (
        <main className="topic empty">
          {hasTopics ? (
            <>
              <h1>Learn from scratch</h1>
              <p className="muted">Pick a topic from the sidebar to start.</p>
            </>
          ) : (
            <>
              <h1>No topics yet</h1>
              <p className="muted">
                Run the <code>learn-from-scratch</code> skill to generate a topic into the{' '}
                <code>content/</code> folder.
              </p>
            </>
          )}
        </main>
      )}
    </div>
  )
}
