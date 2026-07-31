#!/usr/bin/env node
// Move slides in and out of the archive from the command line — handy for batch
// changes or when the dev server isn't running. Archiving never moves a slide's
// content folder; it only sets `archived` in the slide's manifest.json, which
// relocates the slide under the "Archive" branch in the sidebar (see
// src/lib/content.js buildTree). The Archive branch mirrors the slide's normal
// folder hierarchy, so a slide at content/ai/papers/foo shows up under
// Archive ▸ ai ▸ papers ▸ foo.
//
// Usage:
//   npm run archive   -- <slide-path>...     mark each slide archived
//   npm run unarchive -- <slide-path>...     restore each slide
//
// <slide-path> is a slide's folder, given relative to content/ or with the
// content/ prefix — e.g. `ai/papers/foo` or `content/ai/papers/foo`. With no
// flag the script toggles each slide's current state.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const contentRoot = path.join(repoRoot, 'content')

// First arg may be a mode flag; the rest are slide paths.
const argv = process.argv.slice(2)
let mode = 'toggle' // 'on' | 'off' | 'toggle'
const modeFlags = { '--on': 'on', '--off': 'off', '--toggle': 'toggle' }
const paths = []
for (const a of argv) {
  if (a in modeFlags) mode = modeFlags[a]
  else paths.push(a)
}

if (paths.length === 0) {
  console.error(
    'Usage: node scripts/archive.mjs [--on|--off|--toggle] <slide-path>...\n' +
      '  e.g. node scripts/archive.mjs ai/papers/foo',
  )
  process.exit(1)
}

// Resolve a user-supplied slide path to its manifest.json, guarding traversal.
function manifestFor(slide) {
  const rel = slide.replace(/^\/?content\//, '').replace(/\/+$/, '')
  const dir = path.resolve(contentRoot, rel)
  if (dir !== contentRoot && !dir.startsWith(contentRoot + path.sep)) return null
  return path.join(dir, 'manifest.json')
}

let failed = 0
for (const slide of paths) {
  const file = manifestFor(slide)
  if (!file) {
    console.error(`✗ ${slide}: path escapes content/`)
    failed++
    continue
  }
  let manifest
  try {
    manifest = JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    console.error(`✗ ${slide}: no manifest.json (not a slide folder?)`)
    failed++
    continue
  }
  const next = mode === 'toggle' ? !manifest.archived : mode === 'on'
  if (next) manifest.archived = true
  else delete manifest.archived // default state — keep the manifest tidy
  await fs.writeFile(file, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`${next ? '📦 archived  ' : '↩︎  restored  '} ${slide}`)
}

process.exit(failed ? 1 : 0)
