# Content format

A topic is a **leaf folder** under `content/`. The folder path becomes the sidebar
location (e.g. `content/internet/dns` → Internet › How DNS Resolution Works).

```
content/<area>/.../<topic>/
  manifest.json        metadata, levels, sections, sources
  sections/*.md        one Markdown file per section
  assets/*.svg|*.jsx   optional diagram assets / per-topic components
```

## manifest.json

```jsonc
{
  "title": "How DNS Resolution Works",
  "subtitle": "From typing a name to getting an IP address",   // optional
  "dateCreated": "2026-06-10", // ISO YYYY-MM-DD — set to today when first creating the topic, then leave unchanged
  "tags": ["unread"],          // freeform tags for filtering; always include "unread" on a newly created topic
  "levels": [                  // one entry per slider step (as many as the topic needs); entry N is slider level N
    { "caption": "Big picture" },
    { "caption": "The lookup" }
    // … level 1 = start point, last = end point
  ],
  "sections": [
    {
      "id": "what-is-dns",     // unique within the topic
      "title": "What is DNS?",
      "level": 1,              // slider level at which this section first appears
      "file": "sections/what-is-dns.md",
      "additionalReading": true // optional: mark a deeper/optional step (see below)
    }
  ],
  "sources": [
    { "id": "rfc1034", "title": "RFC 1034 — …", "publisher": "IETF", "url": "https://…" }
  ]
}
```

- **`dateCreated`** is an ISO `YYYY-MM-DD` string shown under the subtitle in the topic
  header. Set it to today's date when first creating a topic, then leave it unchanged.
- **`tags`** is an array of freeform strings used for filtering in the sidebar. Always
  include `"unread"` when first creating a topic — the reader removes it once they've read
  the module. Tags can be added, edited, or removed later in the app. Before adding tags,
  survey those already used across `content/` and reuse a fitting existing tag rather than
  coining a near-duplicate; keep tags high-level (the field, the method family, the setting).
- **One section per step**: at slider level L, only the section whose intro `level` is L is
  shown. Moving the slider swaps it for the neighbouring section — one section is on screen
  at a time, nothing accumulates.
- **Keep it sequential**: list sections in reading order and number their `level`s in that
  same order (1, 2, 3, …) — one section per level.
- Use as many levels as the topic needs.
- **Marking optional steps.** Set `"additionalReading": true` on a section to flag it as
  a deeper/optional detour off the main path. Its slider step shows an "additional reading"
  tag with a hollow dot, and its heading gets an "Additional reading" badge.
  Use it for nuance, derivations, or practical asides a reader could skip and still follow
  the thread — not for steps on the core path.
- **References are their own final step.** The app automatically appends a "References"
  step to the slider (built from `sources`), shown on its own at the end. Do **not** add a
  references section yourself or count it in `levels`/`sections` — just list every source in
  `sources` and it appears there.

## Section Markdown

Standard GitHub-flavoured Markdown (headings, **tables**, lists, code), plus the
extensions below.

### Citations — `[[cite:ID]]`

Inline `[[cite:rfc1034]]` becomes a superscript number linking to that entry in the
topic's References list. `ID` must match a `sources[].id`. Attach a citation to every
non-obvious fact.

### Math — `$…$` and `$$…$$`

Formulas are written in **KaTeX**: inline `$…$`, display `$$…$$`. The renderer wires up
`remark-math` + `rehype-katex`, so standard LaTeX works (`\frac`, `\sum`, `\times`,
`\cdot`, `\sigma`, `_`/`^` for sub/superscripts, `\operatorname{ReLU}`).

```
After $n$ periods the balance is $A = P(1+r)^n$.

$$\text{score}(s) = \sigma\!\left( \sum_h w_h \,\operatorname{ReLU}(q_h \cdot k_h(s)) \right)$$
```

- **Every formula, equation, variable, or math symbol uses math mode — never a code span
  or code fence.** Backticks are for code identifiers and literals only (`lm_head`,
  `top-k`, JSON keys). A formula in backticks renders as monospaced text, not math.
- Prefer real LaTeX over Unicode lookalikes: `$W_0$` not `` `W₀` ``, `$d \times k$` not
  `` `d × k` ``.
- **Don't backslash-escape Markdown punctuation inside math.** Write `$x^*$`, not `$x^\*$`.
  Inside `$…$`/`$$…$$`, characters like `*` and `_` are already literal and need no escaping;
  a stray backslash before a non-LaTeX character renders as a red KaTeX error, not the symbol
  you intended.
- The **prose around a formula explains its conceptual implication, not the sequence of
  operations** the formula already shows — see `SKILL.md` → "Explain what a formula means".

### Diagrams — ` ```diagram ` fences

A fenced ` ```diagram ` block holds a JSON spec. Two types:

**`svg`** — render a hand-authored SVG asset (`{ "type": "svg", "src": "assets/x.svg" }`).

**`component`** — a per-topic React component for custom interactivity
(`{ "type": "component", "module": "assets/X.jsx", "props": { … } }`); the module
default-exports a React component.

Use **tables** for comparisons. Pick a diagram genre by what the information *is*, and only
when the visual shows more than a bullet list would. See `SKILL.md` → "Make diagrams do
work" for the full guidance on choosing a genre.
