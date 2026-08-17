# The GenUI Catalog Library — Project Plan

_A founding document for the second project: ready-made, beautiful, agent-facing component catalogs for A2UI, built on svelte-a2ui. Written to be handed to the implementation session as its starting brief._

---

## 1. The idea, from first principles

### 1.1 Why catalogs are the product surface

A2UI splits agent-driven UI into two layers with very different economics:

- **The renderer** (svelte-a2ui) is _infrastructure_. Its job is to be correct, secure, spec-faithful, and boring. It competes on trust. There is exactly one slot for it in the ecosystem, and we are claiming it. Nobody chooses a renderer because it's pretty — prettiness isn't even allowed there ("track the spec, don't improve on it").
- **The catalog** is the _vocabulary_ an agent speaks and the _design_ a user sees. The spec makes catalogs explicitly pluggable — `createCatalogRegistry([basicCatalog, yourCatalog])`, mixable within a single surface, identified by opaque ids, advertised through capability negotiation. This is the sanctioned extension point, the one place where taste is allowed.

Today every team that adopts A2UI gets the 18-component basic catalog — spartan by design, since it must be lowest-common-denominator across React, Angular, Flutter, Lit — and then faces the same problem: _the interesting agent products all need richer vocabulary_. A dashboard. An approval flow. A data table. A diff. Right now, every team designs that vocabulary alone, from scratch, badly.

**A library of ready-made catalogs is the shadcn move applied where it's still greenfield.** shadcn's innovation was never the components — Radix existed, Tailwind existed. It was packaging taste + a distribution model into the gap between primitives and products. The same gap is sitting open one level up the stack, and nobody is in it.

### 1.2 What a "catalog" actually is (three artifacts, not one)

This is the key design insight, and it's what makes the project defensible rather than "another component library":

1. **The contract** — a spec-style `catalog.json`: component names, properties, types, enums, slots, actions. This is _renderer-agnostic_ — it describes what an agent may say, not how Svelte draws it. A well-designed contract that LLMs emit reliably on the first try is the hardest artifact to make and the most valuable.
2. **The prompt-pack** — the agent-facing documentation: a system-prompt snippet describing the vocabulary, plus few-shot JSONL examples per component. An agent can't use a catalog it doesn't know about; the prompt-pack is how the vocabulary gets into the model's context. Nobody ships this today, and it's half the product.
3. **The implementation** — Svelte 5 components registered via svelte-a2ui's `Catalog` entry format (`slots` / `bindings` / `actions` / `raw` classification), themed with CSS custom properties, accessible.

A team adopting a catalog gets all three: the agent knows what to say, the wire knows how to validate it, the browser knows how to draw it.

### 1.3 Why this compounds with svelte-a2ui

- The renderer gives the catalogs credibility ("from the maintainer of the Svelte renderer") and a zero-friction integration story.
- The catalogs give the renderer the demos a booking form can't deliver — the screenshots that make people _want_ the stack.
- Ecosystem listing traffic lands on svelte-a2ui and finds the catalogs one link away.
- Both carry the same name: yours, on two layers of the stack.

And a strategic hedge worth stating: because the contract layer is renderer-agnostic, if A2UI's wire format shifts (v1.0 is a Candidate until ~Q4 2026), or even if a different GenUI protocol wins, the catalog designs and most of the component code port. The bet is on "agents describing UI against host-owned vocabularies," not on one wire format.

---

## 2. What to build first: one killer catalog

Resist the instinct to launch five catalogs. Launch **one** that makes a specific, common, demo-friendly product category gorgeous: the **agent operations / dashboard catalog** — what you render when an agent is reporting, monitoring, analyzing, or asking for a decision. It's the category every agent-product demo lives in.

### 2.1 The `ops` catalog — component inventory (v0: 12 components)

Display:

| Component   | What it is                           | Key props (wire contract sketch)                                                                   |
| ----------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `Stat`      | KPI tile: value, label, delta, trend | `label`, `value`, `unit?`, `delta?`, `trend?: 'up'\|'down'\|'flat'`, `intent?` (shared scale)      |
| `Sparkline` | Inline trend, no axes                | `values` (array or path), `intent?`                                                                |
| `Chart`     | Line/bar/area with axes              | `kind: 'line'\|'bar'\|'area'`, `series: [{label, values}]` or `{path}`, `xLabels?`                 |
| `DataTable` | Columns + rows from the data model   | `columns: [{key, label, align?, format?}]`, `rows: {path}`, `rowAction?` (action with row context) |
| `Badge`     | Status chip                          | `text`, `intent?` (shared scale: `'good'\|'bad'\|'warning'\|'info'\|'neutral'`)                    |
| `Progress`  | Determinate/indeterminate            | `value?`, `max?`, `label?`                                                                         |
| `Timeline`  | Event feed                           | `items: {path}` + item template via collection scope (`title`, `time`, `intent?`)                  |
| `KeyValue`  | Definition list                      | `items: [{key, value}]` or `{path}`                                                                |
| `Callout`   | Alert/note block                     | `title?`, `text` (markdown-safe), `intent`, `icon?`                                                |

Interaction:

| Component       | What it is                                    | Key props                                                                                  |
| --------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `ApprovalCard`  | The agent asks a human to decide              | `title`, `summary`, `details?` (slot), `onApprove`/`onReject` (actions), `requireComment?` |
| `CodeBlock`     | Read-only code/log output                     | `code`, `language?`, `wrap?`, copy button built-in                                         |
| `ConfirmButton` | Destructive action with built-in confirm step | `label`, `confirmLabel?`, `action`, `intent?`                                              |

Deliberately **out** of v0: modals, tabs, forms, inputs (basic catalog already has them and both catalogs mix in one surface — that mixing story is itself a feature to demo), maps, kanban, chat bubbles. Write them down in a ROADMAP so scope stays capped.

### 2.2 Contract design principles (what makes LLMs succeed)

These are the rules that make the vocabulary _emittable_ — treat them as invariants, reviewed for every component:

1. **Flat props, no required nesting.** An LLM juggling a streaming JSONL response should never need balanced deep structures. Arrays of flat objects (`series`, `columns`, `items`) are fine.
2. **Small closed enums, forgiving defaults.** `intent: 'good'|'bad'|'neutral'` beats a free-text color prop (which the spec bans anyway). Every prop except the 1–2 essentials has a default; a component with only its required props must render respectably.
3. **Everything displayable accepts Dynamic values.** Literals, `{path}` bindings, and function refs come free through svelte-a2ui's `buildNodeProps` — design for it: `rows: {path: '/deploys'}` means the agent updates the table with `updateDataModel`, never by re-sending components.
4. **Actions carry hand-picked context.** `ApprovalCard.onApprove` should encourage a `context` of the decision payload, not the world. Document the intended shape in the prompt-pack.
5. **Semantic, never visual.** No colors, no pixel sizes on the wire. `intent`, `trend`, `align` — the host theme decides what those look like. This is spec philosophy applied to the custom catalog, and it's what keeps the catalog portable across themes.
6. **Test the contract on a model before implementing it.** Before writing a component, paste the prompt-pack draft into a Claude/GPT session and ask it to produce the JSONL for a realistic scenario. If the model fumbles a prop shape, fix the _contract_, not the prompt. This is the cheapest design review available and almost nobody does it.

### 2.3 Naming — decided

Product: **auri**. npm scope: **`@aurilabs`**. Repo: `ChaliceForAuri/auri`. Catalog ids are versioned URLs under the docs site (see 3.3).

### 2.4 The quality pillars (added 2026-08-16)

Five commitments layered onto the plan after the vision review — each is a bar, not a feature:

1. **Motion is the hero system.** The signature demo moment is UI assembling itself as the agent streams. Choreography is designed, not incidental: motion tokens (durations, spring curves, stagger) live in `@aurilabs/core`, entrances reserve layout (zero CLS as components arrive), and `prefers-reduced-motion` degrades to opacity-only. This is where the "liquid glass" energy goes — physics and response times, not blur.
2. **Emission evals are permanent CI.** The M1 emission test is not a one-off gate; it becomes a repeatable harness re-run on every model release, with scores published on the docs site (model × component matrix). "Emits cleanly, cold, across model families" is the product claim; the scoreboard is its proof and its marketing.
3. **Accessibility is enforced by the contract.** Agent-composed UI cannot be audited page-by-page — the pages don't exist until runtime. So the schema makes inaccessible output inexpressible: labels are required props, actions require accessible names, intent glyphs carry text alternatives. WCAG 2.2 AA is the floor (also the EU legal bar since June 2025); `forced-colors` and `prefers-contrast` are supported, not afterthoughts.
4. **The in-between states are first-class.** Components arrive before their data binds (`rows: {path}` exists before `updateDataModel` fires). Every bound component defines its skeleton, empty, and error states — the gap is where dashboard quality is felt.
5. **Presentation is product.** The docs site is rendered by the catalog it documents (see 3.5). The bar: people choose the Svelte stack because of what the site made them feel.

The written design language (`docs/DESIGN.md`) — intent semantics, type/density, motion tokens, state rules — is what makes twelve components one designed object instead of twelve components. It is due before M1 completes and is authoritative when it and a component sketch disagree.

---

## 3. Technical architecture

### 3.1 Repo shape (steal the proven infra)

Monorepo-lite: one repo, npm workspaces, because catalogs will multiply but share tooling and theme base.

```
<name>/
  packages/
    core/            # shared: theme base tokens, intent system, tiny utils, prompt-pack helpers
    ops/             # the first catalog
      src/
        catalog.ts   # the svelte-a2ui Catalog object (entries + classification)
        components/  # *.svelte
        theme.css
      contract/
        catalog.json      # spec-style contract (JSON Schema per component)
        prompt.md         # the system-prompt snippet (the prompt-pack)
        examples/*.jsonl  # few-shot fixtures, one per component + combined scenarios
      tests/
  apps/
    docs/            # SvelteKit docs+demo site (GitHub Pages)
  .github/workflows/ # ci.yml + release.yml — copy from a2ui-svelte, they're proven
```

Carry over wholesale from svelte-a2ui (it's all battle-tested now): the two-suite test philosophy (pure logic on `node --test`, components on Vitest browser mode + vitest-browser-svelte + `@vitest/browser-playwright`), `svelte-package` + `publint`, prettier config, the `.js`-extension import convention + resolver hook, CI on Node 22/24 with `svelte-kit sync` before browser tests, npm Trusted Publishing on `v*` tags.

### 3.2 Dependencies (the taste decisions)

- **`svelte-a2ui` + `svelte` as peers.** Catalogs are plugins to the renderer; never bundle it.
- **Headless primitives: `bits-ui`** for anything with real interaction semantics (ApprovalCard focus handling, ConfirmButton's confirm state, future menus/popovers). Accessibility is someone's full-time job — make it theirs. Melt is the lower-level alternative; bits-ui is the recommendation for velocity.
- **Charts: hand-rolled SVG for v0** (`Sparkline` trivially; `Chart` line/bar/area with a minimal scale/axis layer, ~300 lines). Rationale: zero runtime deps keeps the package light and the visual language fully ours; LayerChart is the documented upgrade path if/when `Chart` needs scatter/stacking/zoom. Keep `Chart`'s wire contract independent of this choice so swapping internals is invisible.
- **No Tailwind.** Theme via CSS custom properties like the renderer does — catalogs must drop into any host stylesheet.

### 3.3 Catalog identity and theming

- **Catalog ids** are opaque strings but conventionally URLs — use `https://<your-pages-domain>/catalogs/ops/v1.json` and actually serve the contract there from the docs site. Version in the id (`/v1`) so breaking contract changes are a new id, never a mutation — agents cache vocabularies.
- **Tokens:** extend the renderer's system — `--a2ui-*` base tokens stay authoritative for color/spacing/type so basic-catalog and ops-catalog components look native side by side; add `--<name>-*` tokens only for genuinely new concepts (chart series ramp, intent colors: `--<name>-intent-good/bad/warning/...`). Ship light + dark, both keyed off the same `.a2ui-dark` class the renderer's theme uses, all at `:where()` zero specificity.
- **Intent system** is the design signature: one semantic scale (`good/bad/warning/info/neutral`) used identically by Stat, Badge, Callout, Timeline, Sparkline. Consistency here is what makes the catalog feel like one designed object instead of twelve components.

### 3.4 Testing strategy

Three layers, mirroring what the contract/implementation split implies:

1. **Contract tests (node, fast):** validate every `examples/*.jsonl` fixture against `contract/catalog.json` with ajv — exactly how the A2UI spec repo tests itself. A fixture that drifts from the schema fails CI.
2. **Component tests (browser):** replay each component's fixture through a real `A2uiClient` + `Surface` (the pattern in svelte-a2ui's `tests/browser/` — no mocks, feed `ingest` directly) and assert rendered behavior: DataTable sorts, ApprovalCard dispatches with the right context, Stat renders delta direction, Chart draws N series.
3. **Visual sheet:** one docs page rendering every component in every intent × light/dark, screenshot-diffed manually before releases (the icon-sheet trick — cheap and catches what unit tests can't).

### 3.5 The docs site is the demo (and the marketing)

SvelteKit app, GitHub Pages, using `createMockTransport` with realistic delays so every component page **streams in like an agent is building it** — the aesthetic of the protocol is the sales pitch, so lead with it. Each component page shows four panes: live streaming render · the wire JSONL · the contract excerpt · the prompt-pack snippet. Plus one flagship page: a full "agent ops console" scenario streaming a deploy incident — stats update, timeline grows, an ApprovalCard interrupts for a rollback decision. That page is the demo video for both projects' announcements.

The bar for this site is "out of this world", and the organizing principle is that **the site doesn't present the library — the site _is_ the library, running**, streamed through svelte-a2ui on every page. The signature moments, in build order:

- **The hero is a live incident.** The landing page opens on a blank canvas; within seconds an agent is visibly handling a deploy incident — stats appear, a timeline grows, a chart draws, an ApprovalCard interrupts and the visitor's click branches the story. That page _is_ the flagship scenario above, promoted to the front door.
- **The wire scrubber.** Every component page has a draggable timeline that replays the stream message by message, UI assembling in sync with the highlighted JSONL — "view source" for agent UI. Nobody has been able to scrub through a UI being spoken before.
- **The playground.** Type a scenario, watch a model emit the JSONL live, rendered beside the wire (canned replays by default, bring-your-own-key for live) — the emission claim proven in the visitor's own hands. Paired with the public **eval scoreboard** (pillar 2). Post-launch drumbeat, not launch-blocking.
- **Copy for your agent, everywhere.** Every example ships copy buttons for the JSONL / prompt-pack / contract excerpt; the site serves `llms.txt` and (post-launch) an MCP endpoint. The docs _are_ the prompt-pack — one artifact, two audiences; if a docs example doesn't work as few-shot material, the docs are wrong.
- **The site's own performance is the pitch.** The wow starts in under a second on a phone; SvelteKit static, no bloat — the visitor draws the Svelte-over-React conclusion themselves. Every component page gets an OG share card rendered from the component itself, because love spreads by links.

---

## 4. Sequencing

**M0 — Foundations (a day):** pick the name, register npm scope + repo, scaffold workspaces by copying svelte-a2ui's infra, CI green on empty packages.

**M1 — Contract first (the important milestone):** design all 12 components _on paper_ — `catalog.json` + `prompt.md` + one fixture each — and run the LLM-emission test (2.2 §6) on at least Claude + one other model. Iterate the contract until models emit it cleanly cold. **No Svelte code before this passes.** M1 also produces `docs/DESIGN.md` (the design language, pillar-bearing per 2.4) and runs the emission gate as a _script_, not a one-off — the seed of the permanent eval harness. This milestone is also your public design-notes moment — "designing a UI vocabulary for LLMs" is a genuinely novel writeup that earns attention on its own.

**M2 — Vertical slice (5 components):** Stat, Badge, Callout, DataTable, ApprovalCard end-to-end: implementation + all three test layers + docs pages. This proves every pipeline (contract→ajv, fixture→browser test, docs streaming pane) on the hardest representatives (one bound collection, one action round-trip).

**M3 — Full v0:** remaining 7 components, dark mode polish, the flagship ops-console scenario page.

**M4 — Launch:** docs site live · `0.1.0` to npm · cross-link from svelte-a2ui's README ("Need richer components? …") · announce alongside/after the A2UI ecosystem listing so the credibility compounds · the flagship page becomes the demo video.

**M5 — Distribution v2 (post-launch):** copy-in ownership via `jsrepo` (the established shadcn-style registry tooling in the Svelte ecosystem) for teams that want to own and modify components; the playground + public eval scoreboard as the recurring reason to come back; `llms.txt` and an MCP endpoint so coding agents can discover and integrate the catalogs themselves; evaluate second catalog (`forms` — richer inputs with the checks system — or `commerce`) based on what people actually ask for.

Sequencing note relative to the renderer: finish the svelte-a2ui listing track first (A2A transport → hosted demo → ecosystem PR). The listing is the credibility event this project inherits. Renderer stays boring and stable; this repo is where the visible activity happens.

## 5. Risks, named

- **v1.0 Candidate churn** — wire details may shift until ~Q4 2026. Exposure is low (contracts and components port; only the thin `catalog.ts` registration layer touches renderer API) but pin `svelte-a2ui` versions per release and re-verify on spec updates.
- **LLM emission quality** is the make-or-break UX. Mitigations are the contract principles + the M1 gate + shipping the prompt-pack as a first-class artifact. If a component consistently fumbles, simplify its contract — never paper over with prompt engineering.
- **Scope creep** — the component list above is capped for v0; additions go to ROADMAP, not to the release.
- **One-person maintenance across two repos** — mitigated by the split itself: renderer = stable/boring (low churn once listed), catalogs = where iteration happens. Shared infra means one mental model.
- **Someone else does it first** — the same open-slot logic that applied to the renderer applies here, and the conversabile episode showed the space has other watchers. M1's contract-first approach is fast; speed matters more than polish for claiming the position.

## 6. Kickoff brief for the implementation session

Start the new repo's CLAUDE.md with: what the project is (this doc, condensed), the contract-first invariant (M1 before Svelte code), the emittability principles (2.2), the infra provenance (patterns copied from `ChaliceForAuri/a2ui-svelte` — read its CLAUDE.md for the paid-for gotchas, especially the `.js`-extension/resolver-hook and `svelte-kit sync` ones), and the current milestone. First concrete tasks: name decision → scaffold → write `contract/catalog.json` for `Stat`, `Badge`, `Callout` → run the LLM-emission test → report findings before proceeding.
