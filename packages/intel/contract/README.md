# intel contract — the emission gate log

The M1 record for the intel catalog — auri's third vocabulary and the first designed _with_ a
consumer: every component originates in Hyphen RIE's requests (issues #20–#25), and the gate ran
their scenarios verbatim. Foundations (#20): `subjectKind` + `subjectId` on every drillable
element, merged into drill/feedback contexts by the renderer; `feedbackAction` with the standing
requirement that feedback visibly responds.

Protocol: the pack goes to each model cold — system prompt = the pack below the rule, user
message = one scenario from `emission-scenarios.json`, nothing else. OpenAI through the shared
harness (`npm run eval` here); Claude as fresh sessions. All emissions validated by the same
`createValidator` the contract tests use.

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
