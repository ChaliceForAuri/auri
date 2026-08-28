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

## Round — 2026-08-28, the 0.7.0 re-gate (A2UI v1.0 conformance)

**GATE PASSED: 8/8 scenarios, first cold attempt, zero errors.** The pack changed materially in
0.7.0 — `wantResponse`/`responsePath` were removed from the action rule because the v1.0 spec's
`Action.event` accepts only `name`/`userMessage`/`context` and is `additionalProperties: false`, so
the rule now teaches the three legal keys and points at `updateDataModel` for sending a result back.
Removing an affordance from a pack is exactly the kind of change that can quietly cost emission
quality; it did not. Every scenario emitted clean against the compiled v1.0 contract at the new
`ops/v2.json` id.

**2026-08-17 (M2) — implementation feedback: `onApprove`/`onReject` → `approveAction`/`rejectAction`.** The first browser-test run caught that svelte-a2ui unconditionally strips `on*`-prefixed props (defense against smuggled event handlers — renderer invariant, not negotiable). The contract's action props could never have reached any component. Renamed to the idiom `rowAction` already used; GPT re-emission verified clean against the updated schema. New standing rule: **action props are never named like DOM event handlers** — `somethingAction`, never `onSomething`.

**2026-08-17 (later) — the back six; M1 GATE PASSED FOR ALL 12 COMPONENTS.** `Timeline`, `Sparkline`, `Progress`, `KeyValue`, `CodeBlock`, `ConfirmButton` drafted (Timeline deliberately data-driven — events as data like DataTable rows, not child templates; PLAN table updated). Gate: Claude Fable + Sonnet clean on both new hard scenarios; GPT-5.6 initially failed `deploy-live-ops` twice, producing two more model-driven contract fixes: (1) it emitted `max: {"path": "/totalPods"}` — binding the rollout total to data — which our schema forbade in violation of our own principle 3, so `Progress.max` is now Dynamic; (2) it systematically dropped the **envelope's** final `}` (closing the message but not the wrapper) — the pack now names that trap explicitly and teaches the small-slices rule. With both fixes in the shipped pack: **GPT-5.6 6/6 scenario sweep, zero errors, all 12 components exercised.** M1's emission gate is passed across two model families.

**2026-08-17 — second model family: OpenAI. GATE PASSED for the first six components.** First live run of the eval harness (`npm run eval -- --models openai:gpt-5.6`): **4/4 scenarios, zero schema errors**, all six components exercised. Semantic spot-check of the incident scenario: `xFormat: "datetime"` used correctly with ISO xLabels (round 2's contract fix held cold), the rollback payload staged in the data model and bound into both action contexts via `{"path"}`, prose timestamps humanized while data props stayed ISO, `emptyText` supplied unprompted. With Claude (two tiers) + GPT-5.6 all clean, `Stat`, `Badge`, `Callout`, `DataTable`, `ApprovalCard`, `Chart` pass the M1 gate.

**2026-08-16 — DataTable, ApprovalCard, Chart (the hard three), cold run.** Same protocol, harder scenarios (incident view and weekly review, each composing chart + table + approval). Claude Fable and Claude Sonnet: **zero schema errors in both**. Both bound rows/values with `{"path"}` unprompted, hand-picked action contexts (`{alert, durationDays: 7}`), used custom approve/reject labels well ("Roll back" / "Keep 4190"), and mixed basic-catalog layout correctly. Two findings, both fixed contract-first: (1) Fable emitted ISO timestamps as `xLabels` — correct by the raw-values rule, but the contract rendered xLabels as-given → added `xFormat: 'text'|'datetime'` mirroring the DataTable column `format`; (2) Sonnet embedded a raw ISO timestamp in ApprovalCard summary prose → rule 1 now distinguishes data props (raw) from prose (human). Still open for all six: a second model family (GPT or Gemini).

**2026-08-16 — Stat, Badge, Callout, first cold run.** Prompt-pack pasted into fresh sessions, no repo context, one realistic scenario each. Claude Fable (on-call status view) and Claude Sonnet (payments snapshot): **zero schema errors in both**; rules held under pressure — raw `12400` + `unit: "USD"` instead of `"$12.4K"`, intent omitted on an unremarkable metric, `trend: "up"` with `intent: "warning"` kept as independent axes, explicit `catalogId` on basic-catalog layout containers (inferred for `Row` from a `Column`-only example). Contract refinement from the run: `unit` now explicitly blesses ISO 4217 currency codes. **Open before these three pass the gate: a second model family (GPT or Gemini).**

## Round — 2026-08-20, consumer extensions (#18, #19)

First consumer-driven contract change: Hyphen RIE requested Chart `pointAction` + `markers` and
DataTable `footer` (additive optional props — same v1 catalog id). Gate, all cold on the updated
pack:

- **GPT-5.6 (harness): 8/8** — the six original scenarios (zero regression) plus
  `sentiment-anomaly` (marker on the right index, cluster id in the click context) and
  `impact-ledger` (client-side `sum` footer, never a precomputed total).
- **Claude Fable** (fresh session, sentiment-anomaly): PASS — marker at pointIndex 13 with a
  human label, pointAction context carrying the cluster id.
- **Claude Sonnet** (fresh session, impact-ledger): PASS — exact requested footer shape.

No contract fixes needed this round: both props were emitted correctly on first cold contact by
all three models. The requesting issues specified the shapes in this catalog's own idiom — the
prompt-pack discipline works in both directions.
