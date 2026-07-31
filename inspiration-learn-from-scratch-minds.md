---
title: Learn from Scratch
description: Learn any topic from scratch as a short, progressively-revealed slide deck, generated on demand
thumbnail: inspiration-learn-from-scratch-minds.svg
version: v1
format: v1
---

# Learn from Scratch

This file is the manifest for the **Learn from Scratch** inspiration (slug:
`learn-from-scratch-minds`). It is the one document a future agent reads to understand,
present, and adapt this inspiration. If you are an agent in a mind that was
created from this inspiration, this file is your script: read all of it, then
follow "How to adapt it" below.

## What it is

Learn any topic from scratch as a short, progressively-revealed slide deck, generated on demand

Learn from Scratch turns any topic into a short, self-paced lesson you step through
one idea at a time. You name a topic; the agent (via the bundled `/learn-from-scratch`
skill) researches it from primary sources, proposes a brief curriculum, and — once you
approve it — writes a module of roughly 15-25 bite-sized sections. The web app renders
that module as a single screen with a vertical "detail" slider on the left: each step
down swaps in the next idea, so exactly one coherent concept is on screen at a time,
rendered with GitHub-flavored Markdown, KaTeX math, citations, and small interactive
React diagrams. A left sidebar lists every topic with search, free-form tags, and an
archive; any topic can be annotated in place or exported to PDF. Two example topics ship
with it so the app is not empty on first boot.

## How it works

The snapshot includes these paths (each is a repo-root-relative path copied
from the original mind onto a clean default-workspace-template base):

- `system/apps/learn-from-scratch`
- `.agents/skills/learn-from-scratch`
- `system/scripts/run_learn_from_scratch.sh`
- `system/scripts/rebuild_learn_from_scratch.sh`
- `system/supervisord.conf`

What each path is:

- `system/apps/learn-from-scratch` — the React + Vite web app (the reader UI): sidebar,
  topic view, the vertical detail slider, Markdown/KaTeX rendering, in-place
  annotations, tags, archive, and PDF export. Its `content/` folder holds the learning
  modules — each topic is a `manifest.json` plus one Markdown file per section under
  `sections/`, with optional SVG/JSX diagram assets. Two sample topics live under
  `content/examples/`; all other generated content is gitignored.
- `.agents/skills/learn-from-scratch` — the agent skill that generates a module for a
  topic: research from primary sources, propose a curriculum, write the section files
  and manifest, verify the visuals and math, then rebuild the app.
- `system/scripts/run_learn_from_scratch.sh` — the service start command: installs the app's
  npm dependencies if they are missing, builds the app, then serves it.
- `system/scripts/rebuild_learn_from_scratch.sh` — rebuilds the app in place after content is
  generated or edited, and refreshes the open tab.
- `system/supervisord.conf` — the clean template's process config with one added program,
  `learn-from-scratch`, that runs the start script.

How the pieces wire together at runtime:

- The `learn-from-scratch` supervisord program runs `system/scripts/run_learn_from_scratch.sh`,
  which serves the app with `vite preview` on `127.0.0.1:5173` and registers it with the
  workspace via `system/scripts/forward_port.py --name learn-from-scratch`, so it appears as a
  tab at `/service/learn-from-scratch/`.
- The app is served as a single self-contained HTML build (Vite + `vite-plugin-singlefile`).
  This is deliberate: the workspace reverse proxy stalls the browser's ES-module loader on
  a dev server's external module scripts, so inlining the whole app into one document is
  what makes it load reliably behind the proxy. Because it is a build, newly generated
  content is picked up by rebuilding in place (`system/scripts/rebuild_learn_from_scratch.sh`),
  which `vite preview` then serves without a restart.
- The app's persistence endpoints (`/__annotations`, `/__tags`, `/__archived`) run on the
  preview server too (via `configurePreviewServer` in `system/apps/learn-from-scratch/vite.config.js`),
  so in-app annotations, tag edits, and archive toggles are written back to each topic's
  files under `content/` rather than only living in the browser.

## Recipe

This inspiration is version `v1` (front-matter `version:`).
It is not a fork of the workspace it came from -- it is DERIVED from it by the
recipe below: include these paths, leave these out, apply these
published-version rules. An update re-runs the recipe against the current
workspace and publishes the result as the next version, so anything excluded
here stays excluded even though it still exists in the source workspace. This
block is the durable home of that recipe -- a later update reads it back from
here.

```yaml
version: v1
include:
  - system/apps/learn-from-scratch
  - .agents/skills/learn-from-scratch
  - system/scripts/run_learn_from_scratch.sh
  - system/scripts/rebuild_learn_from_scratch.sh
  - system/supervisord.conf
# The two bundled example topics ("Attention Is All You Need", "How DNS
# Resolution Works") ship as part of the app's own tracked content/examples/,
# so they arrive via the app include above rather than a separate data path.
data_include: []
exclude: []
modification_rules: []
```

## Prerequisites

Activation requirements: what the adopting agent must SET UP -- and must
INITIATE ITSELF during setup, before asking how to adapt -- for this
inspiration to run against the new user's own accounts/data. One line per
requirement, in this machine-readable form (greppable by `requires_`):

No prerequisites -- runs with no external permissions or secrets.

(The app uses no third-party APIs, tokens, or latchkey connectors. It does rely on
Node.js and npm to build and serve the app, and the generator skill uses web search plus
a headless Chromium/Playwright to verify diagrams — all standard in the minds workspace
image, so nothing needs to be provisioned.)

## How to adapt it

Instructions for the NEXT agent -- the one adapting this inspiration into a
new mind. This is the `use-inspiration` skill's template path; in short:

1. Read this entire file first, especially "Prerequisites" and "Holes"
   below -- Prerequisites are your SETUP agenda, Holes are your ADAPTATION
   agenda.
2. Present the inspiration to the user in plain, non-technical language: what
   it is, what it does, and what it needs from them (name the Prerequisites).
3. Ask whether they want to use the same connectors (e.g. their own Slack).
   If YES: ACTIVATE FIRST -- initiate every `requires_permission` line NOW
   via a latchkey permission request (see the `latchkey` skill; the request
   opens the approval/login flow in the minds app), wire up any
   `requires_secret` values, start the services, and get the app showing
   THE USER'S OWN DATA. Done for a data-backed app means the user can open it
   and see their own data -- NOT that a service starts or an endpoint returns
   200. Then tell them it is live and to take a look.
4. Only AFTER that (or immediately, if they chose different connectors -- the
   swap is then the first adaptation) ask: "How do you want to adapt it?"
5. Work through each hole interactively, one at a time. Translate each into
   plain language, ask for a decision only when you genuinely need one, and
   resolve the obvious ones yourself.
6. When done, append a dated entry to "Adaptation history" below (never
   rewrite earlier entries) and commit.

## Holes

- The library ships essentially empty. Only the two demo topics under
  `system/apps/learn-from-scratch/content/examples/` are included ("Attention Is All You Need"
  and "How DNS Resolution Works"). All other generated learning content is intentionally
  excluded (gitignored as user data). A working setup: the adopter generates their own
  topics with `/learn-from-scratch <topic>`, and may delete the two examples once they
  have their own.
- The reader's knowledge profile (`system/apps/learn-from-scratch/user-knowledge.md`) is not
  included (it is personal and gitignored). It does not need to exist up front: the
  generator skill creates it from `user-knowledge.example.md` on first use and asks the
  user to confirm the seeded entries. No action needed beyond running the skill once.
- Nothing else is stubbed or hardcoded: there are no accounts, channels, ids, API keys,
  or external integrations to rewire. The app is self-contained.

## Publication history

This inspiration's changelog: what each published version changed. The PUBLISHER
appends one entry per version (newest last); earlier entries are never rewritten.
This is distinct from "Adaptation history" below, which is the ADOPTERS' log.

### v1 (2026-07-30) -- Modernized re-cut on the current workspace layout and template base.

## Adaptation history

Each mind that adapts this inspiration appends one dated entry below. Earlier
entries are never rewritten.
