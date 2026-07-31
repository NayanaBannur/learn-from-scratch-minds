// Helpers for the section Markdown dialect.
//
// Citations: inline `[[cite:ID]]` becomes a superscript link to the per-topic
// sources list (anchor `src-ID`).

// Drop a leading title heading from a section's markdown. The section head
// already renders the manifest title as an <h2>, so older content that opens
// with `# Title` would print the title twice and waste a heading's worth of
// vertical space. Strips only a leading heading whose text matches the section
// title (the generator writes the title verbatim); newer sections that start
// straight into prose are unaffected.
export function stripTitleHeading(markdown, title) {
  const norm = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase()
  return markdown.replace(/^\s*#{1,6}[ \t]+([^\n]*)\n+/, (full, heading) =>
    title && norm(heading) === norm(title) ? '' : full
  )
}

// Replace [[cite:ID]] with a superscript citation link. `numberFor` maps an id
// to its display number; unknown ids fall back to "?". Any whitespace before the
// marker is consumed so the superscript stays glued to the preceding word and
// never wraps onto a line of its own.
export function applyCitations(md, numberFor) {
  return md.replace(/[ \t]*\[\[cite:([A-Za-z0-9_-]+)\]\]/g, (_, id) => {
    const n = numberFor(id)
    return `<sup class="cite"><a href="#src-${id}" title="${id}">${n ?? '?'}</a></sup>`
  })
}
