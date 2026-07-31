---
name: learn-from-scratch
description: Given a topic, present a curriculum then generate a verified, level-by-level learning module for the web app. Use when the user wants to learn a topic from scratch, asks to "add a topic", or to generate/refresh content under content/.
---

# Learn from scratch

## Why this exists

The goal is to **learn a topic from scratch without being overwhelmed**, and to be able
to **revisit it easily** when concepts are forgotten. The vertical detail slider on the
left is the mechanism: each step down swaps in the next idea, so exactly one coherent step
is on screen at a time and the learner controls how much lands in front of them. Returning
later, they slide back to the step they remember and move on from there.

Everything you generate serves that: concise and glanceable over exhaustive, introducing
exactly one new idea at each level, and correct and grounded so it can be trusted on a
re-read without re-checking the sources.

## Environment (this workspace)

The web app lives at `system/apps/learn-from-scratch/` (served as a running workspace tab at
`/service/learn-from-scratch/`). All content paths below are under that app directory:

- Generated modules go under `system/apps/learn-from-scratch/content/<area>/.../<topic>/`.
- The reader's knowledge file is `system/apps/learn-from-scratch/user-knowledge.md`
  (seed from `system/apps/learn-from-scratch/user-knowledge.example.md`); it is gitignored.
- Generated content is **gitignored** (user data, not code): everything under
  `content/` except the bundled `content/examples/` is out of git. It lives on the
  workspace disk and is captured by the host-level snapshot, but is not versioned in
  git and won't appear in PRs. Do not expect `git` to track new modules.
- The app is served as a bundled production build, not the dev server. After you generate
  or edit a module, run `system/scripts/rebuild_learn_from_scratch.sh` (from the repo root) to
  rebuild the app in place and refresh the open tab so the new module appears.

## What you do

Turn a topic into a glanceable, progressively-revealed learning module that the web
app shows with a detail slider. Work in this order. Do not skip the curriculum step.

## 1. Research first

- Use web search to gather facts from **reliable primary sources** (standards/specs,
  official docs, textbooks, peer-reviewed work). Prefer primary over blog posts.
- **Summaries are fine for the base content; fetch the full source for the specifics.** A
  web-fetch/search summary can be used as the base content — the broad framing and overview
  of an idea. But before you quote, cite, or pull any number, definition, or detail from a
  page, **fetch the actual document/web page in full** and read it. Take quotes, references,
  and specifics from the full text you fetched, never from the summary. If a source is too
  long for one fetch, fetch it in parts until you've read the sections you rely on.
- Collect real, checkable references as you go — capture title, publisher, and URL.
- Note **when** each key idea was introduced or discovered (a year) — you'll place it in
  time for the reader.
- You are building the curriculum from what the topic actually contains, not guessing.

## 2. Present the curriculum and confirm start/end

- Propose the module as an ordered list of **levels — one per logical step (section)**,
  each a one-line caption for the single idea introduced there. Use as many as the topic
  genuinely needs; the slider is vertical and scrolls, so more steps are fine. Keep each
  step one coherent idea.
- Make the **starting point (level 1)** and **ending point (last level)** explicit and
  prominent — these are what the user would most likely adjust.
- Ask the user, in chat, a single question: **"Does this curriculum look good?"**
  - If **yes**, proceed straight to generation — no further questions.
  - Only if **no** (or they want changes), follow up to confirm the start and end points
    (e.g. "start assuming no background?", "stop at practical use, or go to internals?")
    and any other content changes, then revise the curriculum until they approve.
- **Do not generate any files until the user confirms.** Keep it to a short Q&A.

## 3. Generate the module

Write files into `system/apps/learn-from-scratch/content/<area>/.../<topic>/` following
**`CONTENT_FORMAT.md`** in this skill folder (read it).

- One `manifest.json`: `levels` (captions), `sections` (each with its intro `level`),
  `sources` (every reference), `dateCreated` (today's date, ISO `YYYY-MM-DD`), and
  `tags` (always include `"unread"` on a newly created topic).
- **List sources in `sources` only.** The app builds the "References" step from them
  automatically — so don't write a references section or count one in `levels`/`sections`.
- When the module is built from a single paper, set the `title` to that paper's exact
  title (verbatim), and use the `subtitle` for the plain-language framing.
- One Markdown file per section under `sections/`.
- Level 1 = the agreed start; the last level = the agreed end.
- **One logical step per level.** Each level introduces exactly one new section — a
  single coherent idea. The slider swaps it onto the screen. Never reveal two unrelated
  things at the same level.
- **Purely sequential.** List `sections` in reading order and give them intro `levels`
  in that same order (1, 2, 3, …), so each step swaps in the next section. No
  mid-document insertions.
- **To go deeper, add another section** — including when revisiting a fundamental with
  more nuance. Do not edit a section that is already on screen; add the deeper idea as its
  own later section instead.
- The slider reveals each section in order as the reader steps down — you just set each
  section's intro `level`.
- **Name anything non-obvious you carry over from an earlier step.** Only one section is on
  screen at a time, so the reader can't see earlier steps while reading the current one. An
  obvious back-reference to the last step or two is fine — a bare "it" or "this" that clearly
  points to what just came before. But anything non-trivial or non-obvious, or reaching back
  more than a couple of steps, needs the subject named explicitly, not left to a pronoun or a
  definite article ("the model above", "as we saw earlier"). When in doubt, name it.

### Presentation rules

#### Fitting each level

- **Each level must fit the viewport without scrolling.** When the slider lands on a
  level, the reader should see that whole section at once. A section is too big if it would
  scroll on a typical viewport (≈ a heading plus a few short bullets or 2–4 short
  sentences, and at most one visual). Keep the content natural prose and diagrams — the
  only rule is that it *fits*.
- **Don't let any level run long — keep them uniform.** Capping length keeps every level
  glanceable and consistent. Three reasons: it fits the app viewport so the reader never has
  to **scroll within a level**; it keeps the levels **uniform** so stepping through the
  slider feels even; and because the PDF export makes one slide per level and sizes every
  page to the *longest* level, one overstuffed level leaves every other slide in empty space.
  The fix is not to pad the short levels: keep **one idea per level** and let a level be as
  short as that idea needs — short levels are fine. It's to cap the top end. A level
  noticeably longer than the rest is the signal to **split it** into adjacent levels (see
  "split it across several small sequential sections"), so the levels sit within a similar
  range rather than a few towering over the others. Keep any single visual to a moderate
  height so it shares the slide with its heading and a line or two.
- If an idea needs more than fits in the viewport, **split it across several small
  sequential sections at adjacent levels** rather than growing one section. Many small
  steps beat one dense one. A single visual (an `svg`, a table, or a `component`) plus a
  sentence or two is often enough to fill the viewport — give it its own level rather than
  appending it below other content.
- **Fitting the viewport is not the same as being easy to follow — watch conceptual
  density.** A level can fit on screen, use short sentences, and still pack too many new
  ideas to absorb in one read. The real test is whether a reader meeting the topic for the
  first time *understands* the level on a single pass — not whether it physically fits. Be
  especially careful with a single hard idea that needs unpacking (e.g. what an outer
  product *does* to a matrix): give it room to build, or split it onto its own level, rather
  than compressing it into one dense sentence. When a level is correct but hard to follow,
  the fix is more steps, not denser prose.
- **When a step needs many sentences to land, split the level.** If unpacking a step into
  one-idea-per-sentence pieces makes it overflow the viewport, that is the signal to
  **split it into more levels** (see "One logical step per level"), not to re-compress the
  sentences. Density is never the fix for length.
- **Never collapse content.** No `<details>`/accordions, no tabs, nothing hidden behind a
  click. Everything a reader needs at a level is visible the moment the slider lands there.
  If material is too deep or long to sit inline, it becomes its own later section — not a
  collapsed block.
- **Flag optional/deeper steps as additional reading.** If a section is a nuance,
  derivation, or practical aside the reader could skip and still follow the main thread,
  set `"additionalReading": true` on it in `manifest.json`. The app tags that slider step
  (and its heading) as "additional reading" so the core path stays obvious. Don't overuse
  it — most steps are on the main path.

#### Audience & assumed knowledge

- **Read `system/apps/learn-from-scratch/user-knowledge.md` as sample points on the reader's
  knowledge surface — not an exhaustive list.** It gives a handful of terms and phrases; from them,
  infer the rough *shape* of what the reader knows: where they're deep, where they're
  shallow. The surface has hills and valleys — depth is uneven across areas, even adjacent
  ones. A reader can know NLP well yet little of the equivalent basics in computer vision, so
  depth in one area says nothing about a neighbouring one. Use this surface to **calibrate**
  the **field-standard floor** — the default baseline of field knowledge the topic's audience
  is assumed to have. Raise the reader's assumed starting point in areas where the doc shows real depth,
  and pick up any adjacent-field knowledge the topic alone wouldn't imply. For a concept named
  in `user-knowledge.md`, or one that falls clearly within the inferred surface, assume it and
  use it directly.
  - **Infer carefully, and only from specific toward foundational — never the reverse.** A
    specific or advanced entry implies its prerequisites: "binary cross-entropy loss" means
    the reader knows what a *loss* is. The reverse does not hold — knowing "loss" does *not*
    mean they know the different loss functions. When you can't tell whether the surface
    covers something, treat it as **not** covered.
  - **You maintain it**: if it doesn't exist yet, create it from
    `system/apps/learn-from-scratch/user-knowledge.example.md`, then ask the user to confirm or trim the seeded entries to
    what they actually know. After that, **add entries only with the user's explicit
    approval** — they must confirm they know a topic before you record it; never add on your
    own assumption, and never remove a confirmed entry.
- **Assume no prior knowledge *of the topic* — but pitch to the topic's own audience, not
  a total novice.** A topic is self-contained: introduce the background a learner needs
  *within* it, even if another topic in the library also covers it, and never defer to "see
  the X topic." But "from scratch" means *this specific subject*, not the entire field
  beneath it. By default, assume the reader already commands the **standard prerequisites and vocabulary
  of the field the topic lives in** — what someone who sought out this topic would typically
  know. Call this baseline the **field-standard floor**, and use those terms directly rather
  than re-teaching or glossing them. For an ML optimizer
  topic, that default means *optimizer*, *gradient*, *weights*, *training step*, *SGD*,
  *AdamW*, *transformer*, *GPU* are used directly, not defined. Glossing what the audience plainly
  knows talks down to the reader and dilutes the new idea. Reserve every explanation for what
  is genuinely *new at this level* (the topic's own mechanism) or a non-trivial term from an
  *adjacent* field the reader may not have met.
  How much to assume isn't fixed: calibrate it from both the topic (a paper deep-dive assumes
  more than a "what is X" primer) and the reader's knowledge surface inferred from `user-knowledge.md`.
  When `user-knowledge.md` says nothing about an area, keep this default floor — don't read a
  gap into the silence and start explaining basics. Lower the floor only where the doc gives
  positive evidence the reader is shallow there, such as listing only introductory terms for
  that area. When unsure about a term at or below the floor, assume it's known and use it;
  above the floor, teach it instead.

#### Writing & tone

- **Write for a reader who never saw the conversation that produced this.** Readers see only
  the finished slides, never the back-and-forth — a fix must read as plain, direct writing,
  not a clarification aimed at a confusion only visible in the conversation. The two rules
  below follow from this.
- **When correcting existing content, rewrite the passage — don't append a fix onto it.**
  A correction should read as if it were written that way from the start, not as an original
  sentence plus a bolted-on caveat or follow-up clause. Rewrite the whole passage so it reads
  as one coherent piece of writing, not a patch trail.
- **Never lead with a negative frame before the positive fact.** Don't say what something
  *isn't* before saying what it is ("These three keys don't...", "Not every line...") —
  state the actual structure directly. Reserve contrast for correcting a specific factual
  error (a date, number, name), never for style or rhetorical effect.
- **Stay formal and professional — plain is not casual.** Plain language and low-level
  explanation are about *clarity and starting from first principles*, not about a relaxed
  register or talking down to the reader. Write for a capable adult who simply doesn't yet
  know this material — never for a child, and never as if simplifying *because* the reader
  is an amateur. Keep an even, professional tone throughout. Avoid cutesy, breezy, or
  conversational framing ("these tricks have names…", "the magic here is…", "a neat trick",
  "let's play with…", "pretty cool"), exclamation marks, jokey asides, and rhetorical
  hand-holding. Name things precisely: a method is a *method* or *technique*, not a "trick";
  a finding is a *result*, not "cool". Simplicity comes from short sentences, concrete
  examples, and one idea at a time — never from an informal voice. A passage can be fully
  from-scratch and still read like it belongs in a serious technical reference.
- **Teach the jargon, then use it — don't avoid it.** Plain language does *not* mean
  stripping out technical terms. The reader needs the field's real vocabulary to keep
  learning and to read the sources — dodging a term with vague paraphrase cheats them of
  it. Plain language means the reader should *understand* each term **before** it does any
  work. So the first time a genuinely **non-trivial** technical word, acronym, or symbol
  appears (e.g. "KV cache", "ω"), introduce it *together with* a short plain-words meaning
  right there — "X, which means …" — then use the real term freely from then on. Spell out
  acronyms on first use. Apply this only to terms the intended reader genuinely wouldn't
  already know — do **not** gloss everyday words ("key", "value", "input", "layer") or
  terms standard in the topic's own field (for an ML topic, "logit" or "greedy decoding";
  for a genetics topic, "gene"); a parenthetical on
  the obvious clutters the text and talks down to the reader. Explaining less must never
  mean explaining *vaguely*, though: keep the real technical content, and make every
  plain-words meaning **precise and concrete** — plain language is *not* vague language.
  Never replace a term with a fuzzy paraphrase ("a summary", "the information") that leaves
  the reader unable to say what the thing actually *is*; say what it is exactly, just in
  plain words. Never carry a term over from the source paper unexplained just because the
  source used it; but once you've explained it, do use it.
- **One piece of information per sentence — never pack several into one.** This is
  separate from jargon: even when every word is familiar, a sentence that carries multiple
  facts, claims, or clauses at once forces the reader to hold too much in their head and is
  hard to follow. One sentence should make *one* point. Break compound and multi-clause
  sentences apart; state a fact, then the next fact, then what follows from them — in
  separate sentences. A sentence with two "and"s, a "which", and a parenthetical is almost
  always doing too much: split it. Prefer several short sentences (or bullets) over one
  dense line, even at the cost of more words.
- **Keep paragraphs short — 3–4 lines at most.** No paragraph should run longer than
  three or four lines on a typical viewport. A longer block is hard to glance and almost
  always carries more than one idea: break it into separate short paragraphs or bullets,
  and if it still won't fit, split the step into its own level (see "When a step needs many
  sentences to land, split the level"). Default to short paragraphs, bullets, and one idea
  at a time over any dense block.
- **Build, don't assert.** A reader should understand *why* a mechanism works, not just
  be told that it does. Leading with the intuition ("the idea is to measure the same thing
  two independent ways and check that they agree"), then a concrete worked example, then the
  formula is one
  reliable order. Naming the jargon up front and immediately explaining it (see "Teach the
  jargon, then use it") is equally fine — what matters is that the reader *understands* a
  term or symbol before it has to carry weight, not the exact order. If a slide reads
  clearly only to someone who already knows the topic, it has failed the from-scratch
  test — rewrite or split it.
- **Anchor concepts in time.** Where known, mention the year a concept was introduced or
  discovered, so the reader senses how far back the foundations go and how recent the
  newest pieces are (e.g. "the printing press, c. 1440"; "Diffie–Hellman, 1976"). Prefer years
  that match a cited source.
- Concise and glanceable: short sections, bullets and short sentences, minimal prose.

#### Formulas

- **Write formulas as math, not code.** (If no math is involved, skip this and the next
  bullet.) Every formula, equation, variable, or mathematical
  symbol goes in **KaTeX** math — inline `$…$`, display `$$…$$` — never in a code span or
  code fence. Backticks are for code identifiers and literals only (`lm_head`, `top-k`, a
  JSON key); a formula in backticks renders as monospaced text, not math, and reads wrong.
  Write `$BA$`, `$W_0$`, `$d \times k$`, `$\Delta W$`, `$0.25x + 150 = 0.40x$` — not
  `` `B·A` ``, `` `W₀` ``, `` `d × k` ``. The renderer already loads KaTeX (`remark-math` +
  `rehype-katex`); use real LaTeX (`\times`, `\Delta`, `\cdot`, `_`/`^` for sub/superscripts,
  `\sigma`, `\sum`) rather than Unicode lookalikes.
- **Explain what a formula *means*, not the operations it performs.** The math already
  states the sequence of operations — the prose around it must not just narrate that
  sequence. Instead explain the **conceptual implication**: what each part *does to the
  meaning* and why it matters. For $A = P(1+r)^n$, don't say "multiply $P$ by one plus $r$,
  $n$ times" — say "the exponent is why interest compounds: each period's gain itself earns
  in every later period, so the total bends upward instead of climbing in a straight line."
  The same holds for harder formulas: for a multi-head attention score, "the ReLU lets a
  head vote 'relevant' but never 'anti-relevant', so a mismatched head stays silent instead
  of cancelling a real match." Name the operations by their real terms and only gloss one if
  the reader genuinely wouldn't know it — a standard operation like ReLU, a dot product, or a
  sigmoid is named, not re-derived in words (see "Teach the jargon, then use it"). If you
  find yourself re-stating the formula left-to-right in English, delete it and write the
  implication instead.
- **Format math and code for legibility — several inline pieces get messy fast.** A
  sentence carrying several inline equations, symbols, or code spans (`$a$`, `$b_i$`,
  `` `foo()` ``, `$\sum$` …) reads as a dense run of symbols that's hard to parse. Give the
  pieces room: pull anything of substance onto its **own display line** (`$$…$$` for math, a
  fenced block for code), keep only short, single symbols inline, and break a step with
  multiple formulas across separate sentences or a short list rather than stacking them in
  one line. Introduce each symbol before it appears (see "Teach the jargon"). The test is
  whether the reader can take in each expression on its own — if a line is a thicket of `$…$`
  and backticks, restructure it.
- **Pretty-print example JSON and code — never dump it as one compact line.** A multi-key
  object squashed onto one line is hard to scan even in a code fence; format it the way a
  code formatter would, one key per line, indented.

#### Diagrams & visuals

- **Make diagrams do work a bullet list can't.** A diagram must convey something prose
  can't — through *size, position, axes, masks, nesting, or motion*. The test: if a visual
  says no more than a few bullet points read top-to-bottom, it is redundant — cut it or
  replace it. A row of boxes whose meaning only appears when you click them is not a
  diagram; it is hidden bullet points.
- **When a clarification is inherently visual — geometric, spatial, structural, or about
  size/proportion — add or improve a diagram rather than piling on more prose.**
- **Pick the genre the topic's own field uses to show this kind of idea**, then make it
  legible to a beginner (label everything, plain words). The medium is chosen by what the
  information *is*, not by a preference for interactivity. Common mappings:
  - quantities, distributions, trends → a **plot** with named axes + an in-diagram legend
    (e.g. a decay curve, the field's own figure made accessible).
  - sizes, shapes, how data is laid out → **sized-box / array diagrams**, where the
    relative size *is* the point (a tiny box vs a huge one).
  - memory, storage, resource use → an **occupancy / hierarchy** picture (what fills the
    box; small-fast vs large-slow).
  - selecting, indexing, masking, leaving most items out (sparsity) → a **grid with the
    relevant cells highlighted** (one column lit; skipped blocks greyed; before/after a
    reordering).
  - events over time, chronology → a **timeline**.
  - hierarchy, lineage, taxonomy, how things subdivide → a **tree**.
  - a process, cycle, or cause→effect chain → a **stepped flow**, shown all at once (not
    click-to-reveal — see "Don't make the reader work for a diagram that earns nothing").
  - anything spatial or geographic → an **annotated map or layout**.
  - comparisons across options → a Markdown **table**.
  - structure or wiring that genuinely branches → an **`svg`** schematic.
- **Default to static; reach for a `component` only where *manipulating* it teaches
  something a picture can't** — trying your own inputs, sweeping a parameter, making a choice
  and watching the consequence branch, or stepping a process and watching state build. Then invest in it: a sensible default, a **reset**, and
  clear validation of bad input. E.g. let the reader drag a supply-and-demand lever and watch
  the equilibrium price move, *step* a process and watch a running total accumulate while
  memory stays flat, or type their own RSA `p, q, e, m` and watch the keys derive.
  Interactivity is earned by exploration, not added for its own sake.
- **Don't make the reader work for a diagram that earns nothing.** A visual that gates plain
  information behind interaction — most often a click-through diagram that just reveals a
  fixed sequence of steps one box at a time — wastes the reader's time and is worse than a
  short bullet list. Add interaction only when *manipulating* the visual teaches something a
  static picture can't (above); otherwise show everything at once.
- **Label every graph in the spirit of learning from scratch.** A reader meeting the topic
  for the first time must be able to look at a visual and know what they're seeing without
  guessing. So: name every axis (with units/scale), and explain — right in the diagram, not
  only in surrounding prose — what each curve, marker, control, and button *means* in plain
  terms. Spell out what a control *does* and what a quantity is *the … of* (e.g. not "rate"
  but "new cases per 100,000 people per week"; not "p" but "the hidden true success
  probability we're trying to estimate"). Add a short legend or one-line caption mapping colours and
  marks to meaning, and avoid unexplained jargon or bare symbols on buttons. If a reader
  would have to ask "what is this?" or "what does this button do?", the label has failed.
- **Author visuals to the renderer's limits** — it does not wrap or autosize text, so
  overflow is silent (it just clips or overlaps; valid JSON/markup won't catch it):
  - **`svg`:** every text line must fit inside the viewBox width — a long caption clips at
    the right edge with no warning. Keep captions short (or split across lines) and judge by
    the *rendered* width, not the markup. Keep labels clear of boxes, edges, and each other.

#### Citations

- Attach a `[[cite:ID]]` citation to every non-obvious fact. Assume the reader won't
  click them — but they must be real and correct.

## 4. Verify before finishing

- Make a pass over every section: each factual claim must be **traceable to a source**
  in `manifest.json` and consistent with it. Fix or cut anything you cannot ground.
- Sanity-check JSON (`manifest.json`, diagram specs) and that every section `file`,
  asset `src`/`module`, and `[[cite:ID]]` resolves.
- **Verify the visuals actually render correctly — do not stop at valid JSON.** JSON
  validation does not catch overflowing labels, text overlapping a node, edges crossing
  through text, or a component spilling its container. Start your own verification server
  from `system/apps/learn-from-scratch/` with **`npm run dev:verify`** (it runs on a dedicated
  port, `5199`) and **look at every diagram and component at the levels where they appear**,
  driving a real browser at `http://localhost:5199/` (use the `verify` / `run` skill or a
  headless browser to load the topic and capture each diagram). This dev-verify server is
  separate from the user-facing production build served at `/service/learn-from-scratch/`,
  so verifying never disturbs the running tab. It reads content live as you write it, so no
  rebuild is needed while iterating on visuals.
  - **Never kill the workspace's service.** Do not `pkill -f vite`, kill port 5173, or kill
    vite by pattern — that takes down the running `learn-from-scratch` service (the user's
    tab). Start `npm run dev:verify`, and when done stop only the process you started (kill
    its specific PID, or only port `5199`). If `5199` is already in use it's a stale verify
    server of yours — reuse it or kill `5199` alone. For each visual confirm: no label or caption clipped at the viewBox
  edge or spilling its box, no text overlapping another node/edge/label, the component fits
  and its reset + bad-input validation work. Fix overflow by shortening or splitting text /
  simplifying the layout, then re-check — repeat until every visual is clean.
- **Confirm zero KaTeX errors at every level.** A malformed formula renders as red error
  text, not a crash — valid JSON won't catch it. When driving the browser, check that no
  `.katex-error` node is present at any level (and that `.katex` nodes *are*, where you
  expect math). A common cause is backslash-escaping Markdown punctuation inside math (see
  `CONTENT_FORMAT.md` → Math).
- **Gut-check each visual against a bullet list.** For every diagram ask: does it show
  something a few bullets couldn't — through size, position, axes, a mask, or motion? If
  not, replace it with the right genre (see "Make diagrams do work") or just use the bullets.
  A click-through diagram whose boxes only reveal a fixed sequence of text fails this check.

## 5. Hand off

- Rebuild the app so the new module is served: run `system/scripts/rebuild_learn_from_scratch.sh`
  from the repo root (it rebuilds the bundled app in place and refreshes the open tab).
- Tell the user the topic is ready — it appears in the `learn-from-scratch` tab in the
  sidebar under its folder path.

Keep this skill's own output faithful to the above: research, confirm curriculum,
generate, verify.
