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
4. **Actions carry hand-picked context**, documented in the prompt-pack.
5. **Semantic, never visual** — `intent: 'good'|'bad'|'warning'|'info'|'neutral'`, never colors or pixel values. The shared intent scale is the design signature; use it identically across components.
6. **A11y is enforced by the contract** — labels and accessible names are _required_ schema props. Agent-composed UI can't be page-audited (the pages don't exist until runtime), so inaccessible output must be inexpressible in the vocabulary.
7. **Raw values on the wire** — numbers, ISO timestamps, enums; components format with `Intl` in the host locale. An agent never emits `"1,234.56"` or a pre-baked relative time.
8. **In-between states are contract concerns** — components arrive before their data binds, so every bound component defines skeleton/empty/error behavior.

`docs/DESIGN.md` (the design language: intent semantics, motion tokens, density, state rules) is authoritative for how components look, move, and degrade — read it before designing or reviewing any contract, and fix conflicts in its favor.

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

M0 (scaffold) done. **Current milestone: M1 — contract-first design** of all 12 ops components on paper (`catalog.json` + `prompt.md` + one fixture each), then the LLM-emission gate. Progress 2026-08-16: `Stat`, `Badge`, `Callout` drafted (contract + prompt-pack + fixtures) and green under ajv contract tests (`npm test`); `packages/ops/scripts/validate-stream.js` doubles as the emission-harness seed (CLI scores any model output against the contract). First cold-emission run — two Claude tiers, zero schema errors — is logged in `packages/ops/contract/README.md`; the open gate before these three count as passed is a second model family (GPT or Gemini). Next: the hardest three, which stress the rules — `DataTable` (bound collections), `ApprovalCard` (action context), `Chart` (series shapes). No Svelte until M1 passes.

## Conventions

- Tabs, single quotes, semicolons, ~100ch — `.prettierrc` / `.editorconfig` encode it; `npx prettier --write .`, never hand-format.
- Comments explain _why_. Spec requirements and paid-for bugs get comments; mechanics don't.
- Apache-2.0 everywhere, matching the A2UI ecosystem.
- svelte-a2ui and svelte are **peers** of catalog packages, never dependencies.
