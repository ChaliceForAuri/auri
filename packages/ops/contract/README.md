# The ops catalog contract

This directory is the catalog's source of truth, designed **before** any Svelte code exists:

- `catalog.json` — the component contract: names, properties, enums, slots, actions, in the A2UI catalog-definition style.
- `prompt.md` — the prompt-pack: the system-prompt snippet that teaches an agent this vocabulary.
- `examples/*.jsonl` — one realistic fixture per component, plus combined scenarios. These are few-shot material, documentation, and (from M2) the replay fixtures for browser tests and docs pages.

The gate for every component: paste `prompt.md` into a fresh session of at least two model families and ask for the JSONL for a realistic scenario. Iterate the **contract** until they emit it cleanly on the first try. A model fumbling a prop shape is a contract bug, not a prompting problem.

## Tooling

- `npm test` (in `packages/ops`) — validates every `examples/*.jsonl` fixture against `catalog.json` with ajv, plus coverage and catalog-id invariants.
- `node scripts/validate-stream.js <file.jsonl...>` — scores any JSONL stream (e.g. a model's cold emission) against the contract. Tests and evals share this validator so they can't drift.
- `npm run eval` (in `packages/ops`) — **the emission-eval harness** (PLAN 2.4, pillar 2): sends the prompt-pack cold to a model matrix and scores every emission. Providers activate on env keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`); e.g. `OPENAI_API_KEY=sk-... npm run eval -- --models openai:gpt-5.6`. `--list` shows the matrix, `--json <path>` writes scoreboard data, `--models mock:pass` exercises the pipeline offline.

## Emission gate log

**2026-08-16 — DataTable, ApprovalCard, Chart (the hard three), cold run.** Same protocol, harder scenarios (incident view and weekly review, each composing chart + table + approval). Claude Fable and Claude Sonnet: **zero schema errors in both**. Both bound rows/values with `{"path"}` unprompted, hand-picked action contexts (`{alert, durationDays: 7}`), used custom approve/reject labels well ("Roll back" / "Keep 4190"), and mixed basic-catalog layout correctly. Two findings, both fixed contract-first: (1) Fable emitted ISO timestamps as `xLabels` — correct by the raw-values rule, but the contract rendered xLabels as-given → added `xFormat: 'text'|'datetime'` mirroring the DataTable column `format`; (2) Sonnet embedded a raw ISO timestamp in ApprovalCard summary prose → rule 1 now distinguishes data props (raw) from prose (human). Still open for all six: a second model family (GPT or Gemini).

**2026-08-16 — Stat, Badge, Callout, first cold run.** Prompt-pack pasted into fresh sessions, no repo context, one realistic scenario each. Claude Fable (on-call status view) and Claude Sonnet (payments snapshot): **zero schema errors in both**; rules held under pressure — raw `12400` + `unit: "USD"` instead of `"$12.4K"`, intent omitted on an unremarkable metric, `trend: "up"` with `intent: "warning"` kept as independent axes, explicit `catalogId` on basic-catalog layout containers (inferred for `Row` from a `Column`-only example). Contract refinement from the run: `unit` now explicitly blesses ISO 4217 currency codes. **Open before these three pass the gate: a second model family (GPT or Gemini).**
