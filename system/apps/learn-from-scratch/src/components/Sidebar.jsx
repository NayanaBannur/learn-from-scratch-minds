import React, { useEffect, useMemo, useRef, useState } from 'react'
import { nodeLabel } from '../lib/content.js'
import { allTagsOf, tagKey, topicMatchesTags } from '../lib/tags.js'

// Folder-hierarchy navigation. Branch folders are collapsible headings (like a
// file tree); leaf folders are selectable topics. A tag filter at the top narrows
// the tree to topics carrying the selected tags.
export default function Sidebar({
  tree,
  topics,
  selected,
  onSelect,
  tagsByTopic,
  theme,
  setTheme,
  collapsed,
  onToggleCollapsed,
}) {
  // Default: only the top level (depth 0) is expanded. A path present here has
  // been toggled away from its depth-based default.
  const [toggled, setToggled] = useState(() => new Set())
  // While a filter/search is active every matching branch is forced open so the
  // results show — but the reader can still collapse one. We track those explicit
  // collapses separately (default = open) and reset them when the filter clears.
  const [filterCollapsed, setFilterCollapsed] = useState(() => new Set())

  // Tag filter: a set of selected tag keys + match mode ('any' | 'all').
  const [selectedTags, setSelectedTags] = useState(() => new Set())
  const [matchMode, setMatchMode] = useState('any')
  const allTags = useMemo(() => allTagsOf(tagsByTopic), [tagsByTopic])

  // Free-text topic search (separate from the tag filter). The two compose: a
  // topic must satisfy both to remain visible.
  const [search, setSearch] = useState('')

  // Per-topic searchable text: folder path, title, subtitle, level captions,
  // section titles, and section body — lowercased once. Tags are matched live
  // (below) so tag edits take effect without rebuilding this index.
  const searchText = useMemo(() => {
    const m = new Map()
    for (const [dir, topic] of Object.entries(topics)) {
      const parts = [
        dir,
        topic.manifest?.title,
        topic.manifest?.subtitle,
        ...(topic.levels || []).map((l) => l.caption),
        ...(topic.sections || []).map((s) => s.title),
        ...(topic.sections || []).map((s) => s.markdown),
      ]
      m.set(dir, parts.filter(Boolean).join('\n').toLowerCase())
    }
    return m
  }, [topics])

  const toggleTag = (t) =>
    setSelectedTags((prev) => {
      const next = new Set(prev)
      const k = tagKey(t)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const selectedKeys = [...selectedTags]
  const q = search.trim().toLowerCase()
  const searchActive = q.length > 0
  const filterActive = selectedTags.size > 0 || searchActive

  // Collapsing a folder targets `filterCollapsed` while filtering (default open),
  // and `toggled` otherwise (deviation from the depth-based default).
  const toggle = (path) => {
    const setter = filterActive ? setFilterCollapsed : setToggled
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  // Start each new filter session with everything expanded.
  useEffect(() => {
    if (!filterActive) setFilterCollapsed(new Set())
  }, [filterActive])

  // Predicate: does a topic pass both the tag filter and the text search?
  const matches = (topicKey) => {
    if (!topicMatchesTags(tagsByTopic[topicKey] || [], selectedKeys, matchMode)) return false
    if (!searchActive) return true
    if (searchText.get(topicKey)?.includes(q)) return true
    // Match against live tag text too, so a search term can hit a tag.
    return (tagsByTopic[topicKey] || []).some((t) => t.toLowerCase().includes(q))
  }

  const anyMatch = !filterActive || Object.keys(topics).some((k) => matches(k))

  // Collapsed to a slim rail: no tree, search, or filters — just a button to
  // expand back. Hooks above still run so the full state is ready the moment
  // the reader expands again.
  if (collapsed) {
    return (
      <nav className="sidebar sidebar-collapsed">
        <button
          type="button"
          className="sidebar-collapse-toggle"
          onClick={onToggleCollapsed}
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          »
        </button>
      </nav>
    )
  }

  return (
    <nav className="sidebar">
      <div className="brand-row">
        <div className="brand">Learn from scratch</div>
        <div className="brand-actions">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={onToggleCollapsed}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            «
          </button>
        </div>
      </div>

      <div className="topic-search">
        <input
          type="text"
          className="topic-search-input"
          value={search}
          placeholder="Search topics…"
          aria-label="Search topics"
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSearch('')
          }}
        />
        {search && (
          <button
            type="button"
            className="topic-search-clear"
            aria-label="Clear search"
            onClick={() => setSearch('')}
          >
            ×
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <TagFilter
          allTags={allTags}
          selectedTags={selectedTags}
          toggleTag={toggleTag}
          matchMode={matchMode}
          setMatchMode={setMatchMode}
          onClear={() => setSelectedTags(new Set())}
        />
      )}

      {anyMatch ? (
        <TreeLevel
          node={tree}
          topics={topics}
          selected={selected}
          onSelect={onSelect}
          depth={0}
          toggled={toggled}
          filterCollapsed={filterCollapsed}
          onToggle={toggle}
          matches={matches}
          filterActive={filterActive}
        />
      ) : (
        <p className="sidebar-empty">No topics match.</p>
      )}
    </nav>
  )
}

// Cycles light → dark → system → light. "System" defers to the OS-level
// prefers-color-scheme rather than pinning a palette (see useTheme.js).
const THEME_NEXT = { light: 'dark', dark: 'system', system: 'light' }
const THEME_ICON = { light: '☀', dark: '☾', system: '◐' }
const THEME_LABEL = { light: 'Light', dark: 'Dark', system: 'System (auto)' }

function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(THEME_NEXT[theme])}
      title={`Theme: ${THEME_LABEL[theme]} — click to switch`}
      aria-label={`Theme: ${THEME_LABEL[theme]}. Click to switch.`}
    >
      {THEME_ICON[theme]}
    </button>
  )
}

// Tag filter: a search box for adding tags (with a suggestion dropdown), the
// selected tags shown as removable chips, plus an Any/All mode toggle and clear.
// Showing a search instead of every tag keeps the sidebar tidy when there are
// many tags.
function TagFilter({ allTags, selectedTags, toggleTag, matchMode, setMatchMode, onClear }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const hasSelection = selectedTags.size > 0

  // Display label for each selected key (selections always come from allTags).
  const displayOf = useMemo(() => {
    const m = new Map()
    for (const t of allTags) m.set(tagKey(t), t)
    return m
  }, [allTags])
  const selectedList = [...selectedTags].map((k) => ({ key: k, label: displayOf.get(k) || k }))

  // Suggestions: every unselected tag matching the query (substring). The menu
  // scrolls if there are many, so nothing is hidden — type to narrow.
  const q = query.trim().toLowerCase()
  const suggestions = allTags
    .filter((t) => !selectedTags.has(tagKey(t)))
    .filter((t) => !q || t.toLowerCase().includes(q))

  const add = (t) => {
    toggleTag(t) // t is unselected here, so this adds it
    setQuery('')
    setOpen(true)
    inputRef.current?.focus()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && suggestions.length) {
      e.preventDefault()
      add(suggestions[0])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="tag-filter">
      <div className="tag-filter-head">
        <span className="tag-filter-title">Filter by tag</span>
        {hasSelection && (
          <div className="tag-filter-controls">
            <div className="tag-match" role="group" aria-label="Match mode">
              <button
                type="button"
                className={matchMode === 'any' ? 'tag-match-btn active' : 'tag-match-btn'}
                aria-pressed={matchMode === 'any'}
                title="Show topics with any selected tag"
                onClick={() => setMatchMode('any')}
              >
                Any
              </button>
              <button
                type="button"
                className={matchMode === 'all' ? 'tag-match-btn active' : 'tag-match-btn'}
                aria-pressed={matchMode === 'all'}
                title="Show topics with all selected tags"
                onClick={() => setMatchMode('all')}
              >
                All
              </button>
            </div>
            <button type="button" className="tag-filter-clear" onClick={onClear}>
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="tag-filter-search">
        <input
          ref={inputRef}
          type="text"
          className="tag-filter-input"
          value={query}
          placeholder="Search tags…"
          aria-label="Search tags to filter by"
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          // Delay so a click on a suggestion registers before the menu closes.
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
        {open && suggestions.length > 0 && (
          // Suggestions wrap as pills (alphabetical, from allTagsOf) rather than
          // one per line, so many tags stay compact.
          <div className="tag-filter-menu">
            {suggestions.map((t) => (
              <button
                key={t}
                type="button"
                className="tag-filter-option"
                // onMouseDown (not onClick) so it fires before the input blur.
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(t)
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasSelection && (
        <div className="tag-filter-selected">
          {selectedList.map(({ key, label }) => (
            <span key={key} className="tag-filter-chip on">
              {label}
              <button
                type="button"
                className="tag-filter-chip-remove"
                aria-label={`Remove filter ${label}`}
                onClick={() => toggleTag(label)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// True if this branch node contains at least one topic passing the filter.
function nodeHasMatch(node, matches) {
  if (node.topicKey) return matches(node.topicKey)
  return Object.values(node.children).some((c) => nodeHasMatch(c, matches))
}

// Top-level folders pinned to the bottom (after a divider) and collapsed by default.
const PINNED = ['examples', 'archive']

function TreeLevel({ node, topics, selected, onSelect, depth, toggled, filterCollapsed, onToggle, matches, filterActive }) {
  // Folders (branch nodes) come before files (leaf topics); alphabetical within each group.
  let children = Object.values(node.children).sort((a, b) => {
    const aLeaf = !!a.topicKey
    const bLeaf = !!b.topicKey
    if (aLeaf !== bLeaf) return aLeaf ? 1 : -1
    return a.name.localeCompare(b.name)
  })
  // While a tag filter is active, drop branches/leaves with no matching topic.
  if (filterActive) {
    children = children.filter((c) => nodeHasMatch(c, matches))
  }
  // At the top level, push pinned folders (examples, archive) to the end in a fixed order.
  if (depth === 0) {
    const pinRank = (n) => {
      const i = PINNED.indexOf(n.name)
      return i === -1 ? -1 : i
    }
    children.sort((a, b) => {
      const ra = pinRank(a)
      const rb = pinRank(b)
      if ((ra === -1) !== (rb === -1)) return ra === -1 ? -1 : 1
      if (ra !== -1) return ra - rb
      return 0
    })
  }
  // Index where pinned folders start, so we can draw a divider before them.
  const firstPinnedIdx =
    depth === 0 ? children.findIndex((c) => PINNED.includes(c.name)) : -1
  return (
    <ul className="tree" style={{ '--depth': depth }}>
      {children.map((child, idx) => {
        const showDivider = idx === firstPinnedIdx && firstPinnedIdx > 0
        const isLeaf = !!child.topicKey
        if (isLeaf) {
          return (
            <li key={child.path}>
              {showDivider && <hr className="tree-divider" />}
              <button
                className={`leaf ${selected === child.topicKey ? 'active' : ''}`}
                onClick={() => onSelect(child.topicKey)}
              >
                {nodeLabel(child, topics)}
              </button>
            </li>
          )
        }
        // Default-open only at the top level; pinned folders start collapsed.
        // While filtering, surviving branches default open (so matches show) but
        // an explicit collapse still wins; otherwise honor the depth-based default.
        const defaultOpen = depth === 0 && !PINNED.includes(child.name)
        const isCollapsed = filterActive
          ? filterCollapsed.has(child.path)
          : defaultOpen === toggled.has(child.path)
        return (
          <li key={child.path}>
            {showDivider && <hr className="tree-divider" />}
            <button
              className="folder"
              aria-expanded={!isCollapsed}
              onClick={() => onToggle(child.path)}
            >
              <span className={`folder-chevron ${isCollapsed ? 'collapsed' : ''}`} aria-hidden>
                ▾
              </span>
              {nodeLabel(child, topics)}
            </button>
            {!isCollapsed && (
              <TreeLevel
                node={child}
                topics={topics}
                selected={selected}
                onSelect={onSelect}
                depth={depth + 1}
                toggled={toggled}
                filterCollapsed={filterCollapsed}
                onToggle={onToggle}
                matches={matches}
                filterActive={filterActive}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}
