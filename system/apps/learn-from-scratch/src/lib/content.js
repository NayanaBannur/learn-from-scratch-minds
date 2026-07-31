// Loads the `content/` topic hierarchy at build/dev time via Vite globs.
//
import { normalizeTags } from './tags.js'

// Folder model: each leaf folder under content/ is a topic. A topic contains:
//   manifest.json          metadata: title, levels (captions), sections, sources
//   sections/*.md          one Markdown file per section
//   assets/*.svg|*.jsx     optional diagram assets / per-topic components

const manifests = import.meta.glob('/content/**/manifest.json', { eager: true })
const sectionFiles = import.meta.glob('/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const svgFiles = import.meta.glob('/content/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
})
// Per-topic component modules are loaded lazily (each default-exports a React component).
const componentModules = import.meta.glob('/content/**/assets/*.jsx')
// Saved annotations live in `annotations.json` alongside each topic's content.
// Globbed eagerly so the initial render has them (works in dev and in a build).
const annotationFiles = import.meta.glob('/content/**/annotations.json', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function topicDirOf(manifestPath) {
  return manifestPath.replace(/\/manifest\.json$/, '')
}

// Build the list of topics, each resolving its own section markdown + assets.
export function loadTopics() {
  const topics = {}
  for (const [path, mod] of Object.entries(manifests)) {
    const dir = topicDirOf(path)
    const manifest = mod.default ?? mod
    const sections = (manifest.sections || []).map((s) => ({
      ...s,
      markdown: sectionFiles[`${dir}/${s.file}`] ?? `*(missing section file: ${s.file})*`,
    }))
    topics[dir] = {
      dir,
      manifest,
      sections,
      levels: manifest.levels || [],
      sources: manifest.sources || [],
      // Free-form tags for filtering in the sidebar; editable in-app and saved
      // back to manifest.json via the /__tags dev endpoint (see useTags).
      tags: normalizeTags(manifest.tags),
      // Whether this slide is archived. Archived slides are relocated under the
      // "Archive" branch in the sidebar (see buildTree) but keep their content
      // folder in place; toggled in-app or via `npm run archive` (scripts/archive.mjs).
      archived: !!manifest.archived,
      // resolve an asset reference (relative to the topic dir) to raw svg text
      resolveSvg: (rel) => svgFiles[`${dir}/${rel}`],
      // resolve a per-topic component module loader (relative to the topic dir)
      resolveComponent: (rel) => componentModules[`${dir}/${rel}`],
      // annotations.json saved alongside this topic's content (raw text or undefined)
      annotationsRaw: annotationFiles[`${dir}/annotations.json`],
    }
  }
  return topics
}

// Map a topic dir to where it should sit in the sidebar tree. Archived slides
// are relocated under "/content/archive/<relative path>" so the Archive branch
// mirrors the slide's normal folder hierarchy (any needed branch nodes are
// created); unarchived slides sit at their real dir. The slide's content folder
// never actually moves — only its position in the tree.
function treePathOf(dir, archived) {
  if (!archived) return dir
  const rel = dir
    .replace(/^\/content\//, '') // drop the content root
    .replace(/^archive\//, '') // avoid a doubled "archive/archive/…" for legacy folders
  return `/content/archive/${rel}`
}

// Build a nested folder tree from topic directory paths for the sidebar.
// Leaf nodes (topics) carry { topicKey }; branch nodes carry { children }.
// `archivedByDir` optionally overrides each topic's manifest `archived` flag
// (e.g. an in-app toggle that hasn't been persisted to disk yet).
export function buildTree(topics, archivedByDir = {}) {
  const root = { name: '', path: '', children: {} }
  for (const dir of Object.keys(topics)) {
    // A slide is archived if the in-app override, its manifest flag, or its
    // physical location (legacy content/archive/ folders) say so.
    const archived =
      (archivedByDir[dir] ?? topics[dir].archived) || dir.startsWith('/content/archive/')
    // dir looks like "/content/networking/dns"; treePath relocates archived ones.
    const treePath = treePathOf(dir, archived)
    const parts = treePath.split('/').filter(Boolean).slice(1) // drop "content"
    let node = root
    let acc = '/content'
    parts.forEach((part, i) => {
      acc += `/${part}`
      const isLeaf = i === parts.length - 1
      if (!node.children[part]) {
        node.children[part] = {
          name: part,
          path: acc,
          children: {},
          topicKey: null,
        }
      }
      node = node.children[part]
      if (isLeaf) node.topicKey = dir
    })
  }
  return root
}

// Pretty label for a folder/topic node: prefer the manifest title for leaves.
export function nodeLabel(node, topics) {
  if (node.topicKey && topics[node.topicKey]) {
    return topics[node.topicKey].manifest.title || node.name
  }
  return node.name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
