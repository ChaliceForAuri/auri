# CLAUDE.md

Context for Claude working in this repo. Read this before changing anything.

## What this is

**auri** is a library of agent-facing component catalogs for the [A2UI](https://a2ui.org) protocol, built on [svelte-a2ui](https://github.com/ChaliceForAuri/a2ui-svelte) — the maintainer's own Svelte 5 renderer. Where the renderer is infrastructure (spec-faithful, boring, trustworthy), auri is the product surface: ready-made, beautiful, LLM-emittable component vocabularies. The shadcn move, aimed at the catalog layer where the space is still open.

**A catalog is three artifacts, not one.** Every catalog ships:

1. **The contract** — `contract/catalog.json`, a spec-style schema of component names, properties, enums, slots, actions. Renderer-agnostic. The hardest artifact to design and the real IP.
2. **The prompt-pack** — `contract/prompt.md` + `contract/examples/*.jsonl`: the system-prompt text and few-shot fixtures that teach an agent the vocabulary. Half the product; nobody else ships this.
3. **The implementation** — Svelte 5 components registered via svelte-a2ui's `Catalog` entry format, themed with CSS custom properties.

Full plan: `docs/PLAN.md`. Read it before designing anything. The quality pillars (PLAN §2.4) are standing commitments: motion as the hero system, emission evals as permanent CI, a11y enforced by the contract, first-class in-between states, and **presentation as product** — the docs site is rendered by the catalog it documents, and its bar is "people choose the Svelte stack because of what the site made them feel" (PLAN §3.5).

## The invariant that outranks all others: contract-first

**No Svelte component is written until its contract passes the LLM-emission test.** Draft the schema + prompt-pack, paste the prompt-pack into a fresh LLM session (at least two model families), ask for the JSONL for a realistic scenario, and iterate the _contract_ until models emit it cleanly cold. If a model fumbles a prop shape, the contract is wrong — never fix it with prompt engineering.

## Contract design principles (reviewed for every component)

1. **Flat props, no required nesting** — a model streaming JSONL must never juggle deep balanced structures. Arrays of flat objects are fine.
2. **Small closed enums, forgiving defaults** — a component with only its required props must render respectably.
3. **Everything displayable accepts Dynamic values** (literals / `{path}` / function refs) — free via svelte-a2ui's `buildNodeProps`; design for `updateDataModel`-driven updates, not component re-sends.
4. **Actions carry hand-picked context**, documented in the prompt-pack. Action props are named `somethingAction`, never `onSomething` — renderers strip `on*`-prefixed keys as handler-smuggling defense.
5. **Semantic, never visual** — `intent: 'good'|'bad'|'warning'|'info'|'neutral'`, never colors or pixel values. The shared intent scale is the design signature; use it identically across components.
6. **A11y is enforced by the contract** — labels and accessible names are _required_ schema props. Agent-composed UI can't be page-audited (the pages don't exist until runtime), so inaccessible output must be inexpressible in the vocabulary.
7. **Raw values on the wire** — numbers, ISO timestamps, enums; components format with `Intl` in the host locale. An agent never emits `"1,234.56"` or a pre-baked relative time.
8. **In-between states are contract concerns** — components arrive before their data binds, so every bound component defines skeleton/empty/error behavior.

`docs/DESIGN.md` (the design language: intent semantics, motion tokens, density, state rules) is authoritative for how components look, move, and degrade — read it before designing or reviewing any contract, and fix conflicts in its favor. **The visual language is settled (2026-08-18): the Tonal direction** — Material 3 architecture (color roles, tonal containers-not-borders, shape scale) with palette values from Tailwind's open scales, seeded from `--auri-seed` via `color-mix`; chosen by Hugo on the design canvas (claude.ai artifact "auri Design Directions"). Filled intent containers ARE the signal — no borders, no dots on badges.

## Naming and identity

- Product/brand: **auri**. npm scope: **`@aurilabs`** (org exists and is owned by Hugo — Hugo Pretorius, ohheyhugo@gmail.com, GitHub ChaliceForAuri).
- GitHub home is **ChaliceForAuri/auri** — the GitHub names `aurilabs` and `auri-labs` are owned by unrelated third parties; do not reference them as ours.
- Byline discipline: "built by Hugo Pretorius" belongs in every README, docs footer, npm author field, and announcement. The product name spreads; the byline attributes.
- Catalog ids are versioned URLs Hugo controls, e.g. `https://chaliceforauri.github.io/auri/catalogs/ops/v1.json` — served for real by the docs site. Breaking contract changes are a **new id**, never a mutation.

## Infra provenance

Tooling patterns are inherited from `ChaliceForAuri/a2ui-svelte` — read its CLAUDE.md for the paid-for gotchas before "fixing" anything that looks odd, especially: relative imports carry `.js` even from `.ts` (svelte-package requirement, resolver hook maps them back for node tests); `svelte-kit sync` must run before browser tests on fresh checkouts; Vitest 4 browser mode uses `@vitest/browser-playwright`; npm Trusted Publishing on `v*` tags with NO Claude co-author trailers on commits destined for CLA-enforced external repos (Google CLA counts co-authors as contributors).

## Repo shape

```
packages/core/   @aurilabs/core — tokens, intent system, prompt-pack tooling
packages/ops/    @aurilabs/ops — the first catalog (contract/ + src/)
apps/docs/       docs + demo site (GitHub Pages; components stream in via mock transport)
docs/PLAN.md     the founding plan: component inventory, architecture, milestones
```

## Current status

M0 (scaffold) done. **M1 — contract-first design: COMPLETE 2026-08-17.** All 12 ops components drafted (`catalog.json` + `prompt.md` + one fixture each), 15 ajv contract tests green (`npm test`), and the emission gate **passed across two model families**: Claude (Fable + Sonnet, fresh-session protocol) and GPT-5.6 (live harness, 6/6 scenario sweep on the final pack). The eval harness is `npm run eval` in `packages/ops` (providers activate on env keys; `mock:pass` exercises the pipeline offline; results JSON keeps raw transcripts). Four contract fixes came from models, not reviewers — `unit` currency codes, Chart `xFormat`, Dynamic `Progress.max`, the envelope-brace rule — all in the gate log (`packages/ops/contract/README.md`), which is also the raw material for the M1 design-notes writeup.

**M2 complete; M3 component implementation complete (2026-08-17): all 12 ops components are live Svelte.** `packages/ops/src/lib/` — Svelte 5, zero runtime deps, `svelte-a2ui` + `svelte` as peers; tokens (intent/motion/type/skeleton/chart ramp) in `@aurilabs/core/tokens.css`, ops-side global plumbing in `src/lib/theme.css`; charts and sparklines are hand-rolled SVG with pure geometry in `src/lib/chart.ts` and generated text alternatives. Registration pattern: action props needing extra context (`rowAction`, `approveAction`/`rejectAction`) are declared `raw` and dispatched by the component via `getRenderContext().client.dispatch` (merging `row`/`rowIndex`/`comment`); ConfirmButton uses the standard `actions` handler. 20 browser tests replay fixtures through a real `A2uiClient` + `Surface` (`npm run test:browser`, run from `packages/ops/`); `npm run check` clean; `npm run package` (svelte-package + publint) green. One implementation finding fed back into the contract (the `on*` rename, see gate log). Screenshot-review habit: build docs, `vite preview`, playwright-screenshot the sheet in both themes, and actually look — it caught the chart unit collision and a sparkline fill-specificity bug. Restart `vite preview` after rebuilding, or it serves the deleted directory's stale assets.

**The docs app exists (`apps/docs`, SvelteKit static, GitHub Pages via `pages.yml`, base path `/auri`).** Two pages so far, both prerendered: `/` is the seed of the flagship console — the incident scenario replayed client-side (`src/lib/incident.ts`) beside a live wire rail showing both directions; `/sheet` is the visual sheet (every component × every intent × in-between states, dark toggle in the header — this is the pre-release visual diff). The site serves the contract at its canonical id (`/catalogs/ops/v1.json`, synced from `packages/ops/contract` by `scripts/sync-contract.js` — `static/catalogs/` is generated, never edited). The docs app resolves `@aurilabs/ops` to source via vite alias — no dist build needed for docs work. Dark relies on the `.a2ui-dark` class; forcing light under a dark OS is a known gap (renderer token ordering), noted for later. The `/sheet` page covers all 12 components. The flagship console (2026-08-17 evening) now tells the full incident story with nine components — sparkline with data-bound intent, chart + timeline + log tail appearing as the agent investigates, recovery arc at the end — and the entrance-stagger choreography ships in ops `theme.css` (nth-child delays on `.auri-enter`, capped at 8, dropped under reduced motion). Authoring gotcha now also taught by pack rule 5: `updateDataModel` without a `path` replaces the whole data model (it blanked half the console to skeletons before the fix). Per-component doc pages shipped (2026-08-18): `/components` + `/components/[name]` for all 12, prerendered. Four panes, all generated from the shipped artifacts (`scripts/sync-contract.js` copies contract + prompt + fixtures into `src/lib/generated/`, gitignored): the component's own fixture replays as the demo, **the wire scrubber** (autoplay walks the stream; drag or click a wire line to scrub — forward ingests incrementally, backward rebuilds a fresh client), the contract excerpt, and the prompt-pack section, each with copy buttons. Svelte 5 gotcha paid for: `x += 1` inside an `$effect` makes the effect depend on `x` — wrap resets in `untrack` or hit `effect_update_depth_exceeded`.

**M4 (launch) done; post-launch shipped (2026-08-19):** brand settled (flame-only mark + Geist Mono logotype — see memory `brand-identity`, and the large-scale glow gotcha there); OG card refreshed; `/playground` (six unedited GPT-5.6 harness transcripts in `src/lib/playground-data.json`, replayed into live Surfaces — doubles as a regression corpus); `/foundations/shadcn` (two-lane stance + token bridge); **the catalog composer (M5)** — `@aurilabs/core/compose` (pure, zero-dep, tested against real ops artifacts), harness `--pack`/`--contract` flags (`validate-stream` exposes `createValidator`; a composed contract fails vocabulary escapes), and the live `/composer` page. Ecosystem: listing PR a2ui-project/a2ui#2290 + Discussion #2291 are Hugo's and live — do not open new ones (memory `a2ui-ecosystem-submission`). **Next: the forms catalog, M1 contract-first — read `docs/FORMS-BRIEF.md` before drafting** (protocol grounding: checks/actions shapes read from renderer source; capped 10-component inventory; the gate questions the contract must answer).

## Workflow (PR hygiene, since 2026-08-18)

`main` is protected by rulesets on **both** `ChaliceForAuri/auri` and `ChaliceForAuri/a2ui-svelte`: no direct pushes — every change lands via PR with the required CI check green (`check` here; `test (22)` + `test (24)` on the renderer); force pushes and branch deletion are blocked. `v*` tags are creation-restricted to repo admins because tags trigger npm publishing. Zero required approvals is deliberate: GitHub won't let a solo maintainer approve their own PR, so CI is the reviewer. The flow: branch → push → `gh pr create` → wait for checks → squash-merge. Rulesets live at repo Settings → Rules (or `gh api repos/…/rulesets`).

Releases (Hugo's standing authorization, 2026-08-18: Claude runs the whole release flow including tag pushes): bump both packages in lockstep via PR, merge, then `git tag vX.Y.Z && git push origin vX.Y.Z` — the tag triggers `release.yml` (full CI gate, then npm Trusted Publishing, core before ops). `0.1.0` was published manually (npm requires the package to exist before a trusted publisher can be configured); tagged releases start at `v0.1.1`.

## Conventions

- Tabs, single quotes, semicolons, ~100ch — `.prettierrc` / `.editorconfig` encode it; `npx prettier --write .`, never hand-format.
- Comments explain _why_. Spec requirements and paid-for bugs get comments; mechanics don't.
- Apache-2.0 everywhere, matching the A2UI ecosystem.
- svelte-a2ui and svelte are **peers** of catalog packages, never dependencies.
