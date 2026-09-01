# insight contract — the emission gate log

> Renamed from `intel` in 0.7.0, when the catalog was de-domained (contract principle 9) and
> brought into A2UI v1.0 conformance. The gate record below is the ORIGINAL intel run and is kept
> verbatim — it is what actually happened. The 0.7.0 re-gate against the new pack is recorded
> beneath it once run.

The M1 record for the intel catalog (now `insight`) — auri's third vocabulary and the first designed _with_ a
consumer: every component originates in Hyphen RIE's requests (issues #20–#25), and the gate ran
their scenarios verbatim. Foundations (#20): `subjectKind` + `subjectId` on every drillable
element, merged into drill/feedback contexts by the renderer; `feedbackAction` with the standing
requirement that feedback visibly responds.

Protocol: the pack goes to each model cold — system prompt = the pack below the rule, user
message = one scenario from `emission-scenarios.json`, nothing else. OpenAI through the shared
harness (`npm run eval` here); Claude as fresh sessions. All emissions validated by the same
`createValidator` the contract tests use.

## Round — 2026-08-31, Treemap (#47)

Requested by Hyphen RIE for the Product Friction Topography report: area-encoded structure, where
ClusterMap answers the entity-first question. Two model-driven contract fixes, both found cold,
before any Svelte existed:

- **`trend` was missing.** Claude flagged that `intent` alone cannot separate _bad and worsening_
  from _bad and stable_; GPT proved the same gap by smuggling "worsening" into the **title text**.
  The requesting issue had asked for "color encoding trend" and the first draft dropped it.
  `trend` (`up`/`down`/`flat`) is now an axis independent of `intent`, on both nesting levels —
  matching InsightCard, where the two axes were already separate.
- **`windowStart`/`windowEnd` were missing.** With nowhere structured for "since 1 August", the
  period landed in `label` prose — colliding with rule 7 (raw values on the wire, the host
  formats). InsightCard already had both, and `formatWindow` already existed. GPT corroborated
  independently by stuffing `windowStart` into its action context.
- The pack also gained an **omit-don't-invent** rule (an unstated `intent` is not `"neutral"`) and
  a line on what a drill does next — both from questions the cold runs raised.

Gate on the final pack: **GPT-5.6 (harness) PASS**, **Claude Fable PASS**, **Claude Sonnet PASS** —
all cold, all using both new axes correctly, none baking the period into prose.

Implementation findings, from the screenshot habit rather than the tests (all of which were green):
the intent tokens are `--auri-intent-bad-container`, not `--auri-intent-container-bad`, so every
cell silently fell back to grey; and a parent's value line collided with its children's labels.

_Owed:_ the full 7-scenario GPT regression sweep. `api.openai.com` became unreachable from the work
machine mid-session (`fetch failed` on every call; the harness correctly refused to score it rather
than reporting 0/7). The pack diff is one hunk of 37 pure insertions inside the new Treemap
section — no other component's teaching text changed by a byte — so cross-component risk is bounded,
but run `npm run eval` before the next release.

## Round — 2026-08-28, the 0.7.0 re-gate (de-domaining + v1.0 conformance)

**GATE PASSED: 6/6 scenarios, first cold attempt, zero errors**, on the pack that changed most —
`intel` became `insight`, two closed enums became free strings, and four props collapsed into
`metrics` + `tags`.

The semantic spot-check matters more than the score here, because it settles whether contract
principle 9 was right:

- **The model emitted `signalType` values that did not exist in the old enum** — `report_accuracy`
  and `account_risk`, alongside the familiar `friction`. Under 0.6.0 those were unemittable: the
  model would have taken a schema violation or been forced into a bucket that misdescribed the
  finding. This is the clearest evidence available that the closed enum was constraining real usage
  rather than guiding it.
- **`metrics` was used generously** — one card carried three figures ("Cases", "Enterprise
  accounts", "ARR affected"). The old contract could express exactly two, because we guessed which
  two mattered.
- **Per-metric `intent` was used unprompted** (`"intent": "warning"` on a count), which the old
  fixed `revenueAtRisk` prop could never carry.
- **Zero legacy props leaked** — no `caseCount`, `revenueAtRisk`, `currency` or `themes` anywhere.
- `tags` appeared where facets were meaningful and was omitted otherwise, which is the intended
  "earns its place" behaviour rather than dutiful field-filling.

## Round 1 — 2026-08-20, first cold contact: PASSED

- **GPT-5.6 (harness): 6/6.** All five components on first contact, including the mixed
  drill-path (DrillStack + an ops DataTable with `footer` at level two, explicit catalogId) and
  the feedback-response scenario — where it bound `visible` to data paths on both cards
  _proactively_, then answered the thumbs-down with one `updateDataModel` flipping the path.
  Rule 6 exactly as written, no re-sends.
- **Claude Fable (fresh session): 3/3** — surface-insight (full metadata, `confidence: 0.8` raw,
  never a percentage), drill-path (components in batches, depth as data), feedback-response
  (same proactive-visible pattern as GPT, independently).
- **Claude Sonnet (fresh session): 3/3** — account-velocity (momentum vectors raw and signed),
  risk-clusters (all reasons carried), case-audit (14:07 emitted as raw `durationSeconds: 847`;
  transcript bound for async streaming).

**Zero contract fixes needed.** Two inheritances did the work: the component-batching rule
(found by forms' round-1 failure) shipped in this pack from day one — no long-line brace losses
anywhere — and the issues specified their components in auri's own idiom, so the contract mostly
transcribed design that was already right. The `visible`-binding feedback response emerged
identically in two model families without being shown as an example: the pack stated the rule,
both models derived the mechanism.

M1 exit criterion met — implementation (M3) may begin: 5 Svelte components, with SourceAudit's
media player and VelocityScatter's shape-summarising text alternative as the hard parts, and
DrillStack's focus restoration as a browser test.

## M3 — 2026-08-20, implementation complete

All five components live Svelte (`src/lib/`), 9 browser tests. One implementation finding worth
the log: **exact focus restoration requires the levels to survive** — DrillStack's first cut
keyed-remounted the active level, which destroyed the element focus should return to; the fix
renders every level mounted-but-hidden, so "returns exactly where it left" is literal element
identity, verified by the browser test. Also kept from the issues: SourceAudit never autoplays
and treats an empty transcript as "still processing"; VelocityScatter's text alternative
summarises the shape (falling count, largest, fastest) and traverses weight-descending; the
subject merge (#20) is one shared helper (`subject.ts`) used by every raw action.

## Round 4 — 2026-08-22, the first automated catch

The nightly harness went live and immediately failed `drill-path` on GPT-5.6:

```
InsightCard 'report_accuracy_insight': data/drillAction must NOT have
additional properties; must match exactly one schema in oneOf
```

The model had emitted `{"event": {"name": "insight_drilled"}, "context": {...}}` —
`context` as a **sibling** of `event` rather than nested inside it.

**The pack was at fault, not the model.** Rule 1 instructs the agent to put
things in `context` ("put only what the renderer can't know there"), but not one
of this pack's six action examples ever showed an action _carrying_ a context —
every one was `{"event":{"name":"…"}}`. The ops pack does show the nesting, and
ops passed 8/8 in the same run. A pack that names a field it never demonstrates
is an incomplete artifact, and the model made the reasonable guess.

Fix: four examples now carry a nested `context`, and rule 1 states the shape
explicitly with the invalid form called out. Verified 3/3 on re-run.

Recorded because it is the first failure caught by automation rather than by a
person running the harness by hand — which is exactly what pillar 2 exists for.
