# forms contract — the emission gate log

The M1 record for the forms catalog: every gate run, every failure, and every contract fix that
came out of one. Kickoff brief with the protocol grounding: `docs/FORMS-BRIEF.md`.

Protocol: the pack goes to each model **cold** — system prompt = the pack below the rule, user
message = one scenario from `emission-scenarios.json`, nothing else. OpenAI runs through the live
harness (`npm run eval` here, which reuses ops' harness via `--pack`/`--contract`/
`--scenarios-file`); Claude runs as fresh sessions (Fable and Sonnet, one scenario each per run).
Emissions are validated by the same `createValidator` the contract tests use.

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
