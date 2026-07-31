// Shared helpers for topic tags. Tags are free-form labels stored per topic
// (in manifest.json). We keep each tag's display form as the user typed it, but
// treat them case-insensitively for uniqueness and matching, so "Attention" and
// "attention" are the same tag.

// Comparison key for a tag: trimmed + lowercased.
export const tagKey = (t) => String(t).trim().toLowerCase()

// Clean a raw tags value (array or anything) into a trimmed, de-duplicated list,
// preserving first-seen display casing and dropping blanks.
export function normalizeTags(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const out = []
  for (const t of raw) {
    const display = String(t).trim()
    if (!display) continue
    const key = display.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(display)
  }
  return out
}

// Every distinct tag across all topics, sorted alphabetically (case-insensitive).
export function allTagsOf(tagsByTopic) {
  const seen = new Map() // key -> display
  for (const tags of Object.values(tagsByTopic)) {
    for (const t of tags) {
      const key = tagKey(t)
      if (!seen.has(key)) seen.set(key, t)
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

// Does a topic's tag list satisfy the selected tags under the given mode?
//   'any' – has at least one of the selected tags (OR)
//   'all' – has every selected tag (AND)
// With nothing selected, everything matches.
export function topicMatchesTags(topicTags, selectedKeys, mode) {
  if (!selectedKeys.length) return true
  const have = new Set(topicTags.map(tagKey))
  return mode === 'all'
    ? selectedKeys.every((k) => have.has(k))
    : selectedKeys.some((k) => have.has(k))
}
