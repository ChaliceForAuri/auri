# forms — M1 kickoff brief

The second catalog. Same discipline as ops: **no Svelte until the contract passes the
emission gate across two model families, cold.** This brief records the protocol grounding
and the design position so contract drafting starts from evidence.

## Positioning: why forms exists when basic has inputs

The basic catalog already ships input primitives — `TextField`, `CheckBox`, `ChoicePicker`,
`DateTimeInput`, `Slider`, plus `ValidationMessages` — and svelte-a2ui renders them all.
forms is not those primitives again. It is the **form layer**: what ops is to "display a
metric," forms is to "collect an answer."

- **Field, not input.** A forms field is label + control + hint + error as one flat
  component, with the label _required by schema_ (a11y principle 6: inaccessible output
  must be inexpressible). Basic inputs leave labeling and error wiring to composition —
  exactly the part models fumble.
- **Form-level semantics.** Submission that aggregates bound values into action context,
  disabled-until-valid, pending state, a cancel path. Progressive structure (sections)
  rather than raw layout containers.
- **In-between states** (principle 8): fields render before data binds — skeleton, and a
  read-only "submitted" state so a completed form is a record, not a dead control.

## Protocol grounding (read from svelte-a2ui source, 2026-08-19)

- **Checks** (`protocol/types.ts`): inputs carry
  `checks: [{ call, args?, message }]`; buttons carry
  `{ condition: { call, args }, message }`. `call` names the spec's built-in functions
  (14 shipped: required, regex, minLength, …). The forms contract should expose checks
  **verbatim** — inventing a validation dialect would break renderer-side evaluation.
- **Actions** (`protocol/types.ts`): `{ event: { name, context, wantResponse,
responsePath } }` — `responsePath` writes the agent's `actionResponse.value` back into
  the data model. That is the primitive behind server-validated submits: submitAction with
  `wantResponse` + a `/form/serverError` path the agent can fill.
- **Two-way binding**: input components write to data-model paths. Every forms control
  takes a required `path` — the agent reads answers from the data model, never from
  action payloads alone.

## Inventory, capped for v1 (10)

| Component     | One-liner                                         | Notes                                                                                           |
| ------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| TextField     | single-line text with label/hint/checks           | `kind: text/email/url/tel/secret` closed enum                                                   |
| TextArea      | multi-line with counter                           | `maxLength` drives the counter                                                                  |
| NumberField   | number with unit/min/max/step                     | raw numbers on the wire (principle 7)                                                           |
| SelectField   | one-of from flat options                          | `options: [{value, label}]`, no nesting                                                         |
| RadioGroup    | one-of, all options visible                       | same options shape as SelectField                                                               |
| CheckboxGroup | many-of from flat options                         | same options shape                                                                              |
| Toggle        | a single boolean                                  | label required, not a bare switch                                                               |
| DateField     | ISO date, min/max                                 | renderer formats per locale                                                                     |
| FormSection   | title + description + children slot               | the only slotted component                                                                      |
| SubmitBar     | submit + optional cancel, pending/disabled states | submitAction context carries hand-picked paths; `wantResponse`/`responsePath` for server errors |

Cut from v1 (ROADMAP, not the release): FileDrop (no clean wire story), SliderField
(basic's Slider suffices), rating/signature (niche).

## Contract questions the gate must answer

1. Do models keep `checks` in the flat `{call, args, message}` shape cold, or do they
   invent `validation:`/`required: true` dialects? (If they invent, the contract is
   wrong — consider a `required: boolean` sugar prop that compiles to a check.)
2. Do models reliably emit `path` per field, or collide paths across fields? Scenario
   prompts must force multi-field forms to find out.
3. SubmitBar context: hand-picked paths (ops `rowAction` precedent) vs "collect
   everything under a prefix"? Draft both, let the gate decide.
4. Options arrays: `{value, label}` vs bare strings — models may emit bare strings when
   value == label; consider accepting both (forgiving defaults, principle 2).

## Gate plan

Six scenarios in `emission-scenarios.json` style: contact form, incident postmortem
intake, deploy-approval form with a required justification, settings panel with server
validation round-trip, survey with branching sections, sign-up with per-field checks.
Harness: `--models openai:gpt-5.6` live + Claude fresh-session protocol; the composed
`--contract` flag means forms scenarios can also gate ops+forms **mixed** compositions —
the first real multi-catalog eval.

Repo mechanics when drafting starts: `packages/forms` mirrors `packages/ops` (contract/
first, src/ only after the gate), lockstep versioning joins core+ops, and the composer
gains a second source catalog — `composeCatalog` is already multi-source-shaped except
for the pack merger, which is single-source v1.
