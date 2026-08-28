# forms contract — the emission gate log

The M1 record for the forms catalog: every gate run, every failure, and every contract fix that
came out of one. Kickoff brief with the protocol grounding: `docs/FORMS-BRIEF.md`.

Protocol: the pack goes to each model **cold** — system prompt = the pack below the rule, user
message = one scenario from `emission-scenarios.json`, nothing else. OpenAI runs through the live
harness (`npm run eval` here, which reuses ops' harness via `--pack`/`--contract`/
`--scenarios-file`); Claude runs as fresh sessions (Fable and Sonnet, one scenario each per run).
Emissions are validated by the same `createValidator` the contract tests use.

## Round — 2026-08-28, the 0.7.0 re-gate (A2UI v1.0 conformance)

**GATE PASSED: 6/6 scenarios, first cold attempt, zero errors** — including `signup-checks`, which
once failed 4/4 in suite context before the action-shape rule existed.

This was the run most likely to fail, and the reason is worth writing down. Conformance moved checks
from the flat `{"call","args","message"}` to the spec's `{"condition":{"call","args"},"message"}` —
**one more level of nesting**, and nesting depth is what this gate has historically punished: both
the envelope-brace trap and the action-shape trap were nesting failures, and the action-shape trap
specifically was models hoisting keys OUT of a wrapper. The prediction was that wrapping the call in
`condition` would reproduce it.

It did not. Every check in every scenario came back correctly wrapped. One data point, not a law —
but it suggests the earlier failures were about _balancing braces across a long line_, not about
depth as such, since `condition` adds depth without lengthening the structure a model must hold open.

## Round 1 — 2026-08-19, first cold contact

**GPT-5.6 (live harness): 5/6.** Passed contact-form, postmortem-intake, deploy-approval-form,
settings-server-validation, survey-sections — correct checks shapes, unique paths per field,
sectioned layouts, `wantResponse`/`responsePath` wiring, and the length/regex **split** for the
handle rule (avoiding `{3,15}` inside a regex while a `length` check exists — an idiom the pack
never taught).

**Failed signup-checks, and failed it systematically: 3/3 runs, same failure.** Each time, exactly
one `}` lost near position ~1300 of a single `updateComponents` line whose last component was the
deepest structure in the vocabulary (SubmitBar with `pending` + hand-picked `context` +
`wantResponse` + `responsePath`). Brace balance +1 every time. Not a prop-shape error — a
line-length stamina failure, and the pack invited it: the small-slices rule covered data but not
components, and every example emitted a whole form as one line.

**Claude (fresh sessions): 6/6.** Fable took contact-form, deploy-approval-form, survey-sections;
Sonnet took postmortem-intake, settings-server-validation, signup-checks. All validated clean on
first emission — including Sonnet acing the exact scenario GPT drops braces on, and two unprompted
idioms worth recording: Fable used bare-string options where value == label (the forgiving
`option` oneOf paid for itself), and Sonnet displayed the server rejection by binding a
basic-catalog `Text` to the `responsePath` target — cross-catalog composition the pack only
implies.

**Contract fix from the failure** (the ops envelope-brace rule's sibling): component batching is
now a wire rule. Pack rule 6 — `updateComponents` merges by id; emit two or three components per
message, never a whole form in one line — and the complete example now streams its components in
two batches. Contract `instructions` §7 mirrors it.

## Round 2 — 2026-08-19, retest after the batching rule

**GPT-5.6 × signup-checks × 3: PASS, PASS, PASS.** The systematic brace loss is gone — with
components arriving in short batches, no line gets long enough to lose one. All six Claude
emissions from round 1 also validate formally through `createValidator` (they predate the
batching rule and pass regardless; the rule is belt-and-braces for them).

## The verdict — gate PASSED across two model families, 2026-08-19

- **GPT-5.6**: 5/6 first cold contact; the one systematic failure produced the batching rule;
  3/3 on the fixed scenario; full-sweep result on the final pack recorded below.
- **Claude Fable**: 3/3 (contact-form, deploy-approval-form, survey-sections), fresh sessions.
- **Claude Sonnet**: 3/3 (postmortem-intake, settings-server-validation, signup-checks), fresh
  sessions.

Brief questions answered by the gate: models keep the `checks` dialect verbatim (no `required:
true` sugar needed — **don't add it**); paths stay unique per field unprompted; hand-picked
submit context works across families; the forgiving `option` oneOf earns its place (bare strings
and objects both appeared, correctly). M1 exit criterion met — implementation (M3) may begin.

## Round 3 — final full sweep on the shipped pack

**GPT-5.6, all six scenarios, final pack: 6/6.** contact-form (4.8s), postmortem-intake (7.3s),
deploy-approval-form (5.2s), settings-server-validation (13.0s), survey-sections (7.1s),
signup-checks (8.6s). Combined with Claude Fable 3/3 and Sonnet 3/3, the forms contract is
emission-gate green cold across two model families with one contract fix (component batching)
found by a model, not a reviewer.

## Round 3 — 2026-08-22, a stochastic brace drop (no contract change)

The first automated nightly failed `signup-checks` with
`line 4: not valid JSON` — brace balance +1, a dropped closing brace on the
SubmitBar line (submitAction with context, `wantResponse` and `responsePath`:
the deepest structure in this vocabulary, and the same scenario whose 3/3
failure produced the component-batching rule in round 1).

**Re-ran it three times: 3/3 PASS.** The model had batched correctly (four
lines, none long) and still slipped one brace. Combined with round 2's 3/3 and
the final sweep's 6/6, this is a low-rate model slip on the deepest nesting,
not drift and not a contract defect — so the contract is unchanged, on purpose.

What it did change is the harness. A single-sample nightly that fails this way
periodically trains you to ignore it, so failures are now CLASSIFIED
(`malformed-syntax` · `schema-violation` · `vocabulary-escape` · `root-missing`
· `envelope`) and the summary says whether a red run is a model slip or a
contract problem. Only the latter is ever fixed in the contract.

### Addendum — the rate was measured, and the diagnosis changed

The "low-rate model slip" reading above was too generous. Measured properly:

| how it was run                    | result                                                         |
| --------------------------------- | -------------------------------------------------------------- |
| `--scenarios signup-checks` alone | 3/3 PASS                                                       |
| as part of the full suite (local) | 2/2 FAIL                                                       |
| as part of the full suite (CI)    | 2/2 FAIL                                                       |
| `signup-checks,contact-form`      | **both FAIL** — including contact-form, which had never failed |
| `contact-form,signup-checks`      | both PASS, minutes later, unchanged contract                   |

Failures cluster by **run**, not by scenario or position, and `finish_reason`
was `stop` every time, so nothing was truncated. That is provider-side
variance, not a contract defect — which is why the contract is still unchanged,
now for a measured reason rather than an assumed one.

The harness changed instead: a failed scenario is re-run once cold, and only a
failure that reproduces reddens the build (`FLAKY` vs `FAIL`). Scores stay
first-attempt, so the published claim is untouched.

### Resolution — the action-shape rule (2026-08-22)

The brace drops were a **symptom, not the disease**. A later automated run
failed `settings-server-validation` with a schema violation, and the emission
showed why:

```json
{"event":{"name":"…","context":{…}}, "wantResponse":true, "responsePath":"/serverError"}
```

`wantResponse` and `responsePath` hoisted OUT of `event`. Intel had failed the
same way hours earlier with `context`. Models consistently pull the
modifier-ish keys out of the `event` wrapper — auri's own principle 1 (no
required nesting) violated by a protocol-mandated shape we cannot flatten.

So the packs name the trap, exactly as the envelope-brace and batching rules
do: every catalog now states that `name`, `context`, `wantResponse` and
`responsePath` all live INSIDE `event`, with the invalid form shown beside the
correct one.

**Result: forms went 6/6 on the full suite, signup-checks included** — the
scenario that had failed 4/4 in suite context. The dropped braces appear to
have been downstream of nesting uncertainty: a model unsure where a structure
ends is a model unsure where to close it. Fixing the shape fixed the syntax.
