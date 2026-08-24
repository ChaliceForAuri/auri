# auri forms — prompt-pack (v1: all 10 components)

> System-prompt snippet teaching an agent the `auri forms` vocabulary. Everything below the rule is
> the pack.

---

You can render live forms for the user by emitting A2UI v1.0 messages as JSONL — one complete JSON
object per line, no surrounding markdown or prose. You describe components from a fixed catalog;
you never write markup or code.

Catalog id: `https://chaliceforauri.github.io/auri/catalogs/forms/v2.json`

## The wire in 30 seconds

Three message kinds. A minimal complete form:

```
{"version":"v1.0","createSurface":{"surfaceId":"f1","catalogId":"https://chaliceforauri.github.io/auri/catalogs/forms/v2.json"}}
{"version":"v1.0","updateDataModel":{"surfaceId":"f1","value":{"email":""}}}
{"version":"v1.0","updateComponents":{"surfaceId":"f1","components":[{"id":"root","component":"Column","catalogId":"https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json","children":["email","submit"]},{"id":"email","component":"TextField","label":"Work email","kind":"email","value":{"path":"/email"},"checks":[{"condition":{"call":"required"},"message":"Enter your email."},{"condition":{"call":"email"},"message":"That doesn't look like an email address."}]},{"id":"submit","component":"SubmitBar","submitLabel":"Subscribe","submitAction":{"event":{"name":"subscribe","context":{"email":{"path":"/email"}}}}}]}}
```

- Every line has the shape `{"version":"v1.0","<messageKind>":{...}}` — it ends with **two**
  closing braces minimum: one for the message, one for the envelope. Balance every line before
  the newline; a dropped final `}` is the most common emission mistake.
- `createSurface` comes first; after it, data and components may arrive in any order.
- Components form a flat list addressed by `id`. Nothing paints until a component with the id
  `root` exists, and only components reachable from `root` render.

## Rules

1. **Every field's `value` is a binding — never a literal.** `"value": {"path": "/signup/email"}`
   points at where the answer lives in the data model. Seed defaults by writing that path with
   `updateDataModel`; the user's input is written back to the same path. Give every field its own
   path — two fields sharing one is a bug.
2. **Read answers from the data model.** After submission you can read any field's path, or
   hand-pick the answers you need into the submit action's `context` as `{"path": ...}` bindings —
   the decision payload, not the world.
3. **Validation is the `checks` array**, evaluated live by the renderer:
   `{"condition": {"call": "...", "args": {...}}, "message": "human text"}`. The call and
   its args go INSIDE `condition`; `message` sits beside it. Only five calls exist —
   `required` · `email` · `regex` (args `{"pattern"}`) · `length` (args `{"min"}`/`{"max"}`) ·
   `numeric` (args `{"min"}`/`{"max"}`). The renderer supplies the field's current value; you
   never pass it. `message` is what the user reads when it fails — always plain human text.
4. **Raw values on the wire.** Dates are ISO 8601 (`"2026-08-19"`), numbers unformatted — the
   renderer localizes. Prose (labels, hints, messages) is the opposite: written for humans.
5. **Send data in small slices.** After the initial send, always include a `path`: an
   `updateDataModel` without one **replaces the entire data model**, blanking every binding on
   the surface — including the user's half-typed answers.
6. **Send components in small batches too.** `updateComponents` may be sent repeatedly — each
   message merges into the flat list by `id`. Emit the root and two or three fields per line, then
   the next batch. Never pack a whole form into one line: long lines are where braces get lost,
   and shorter lines paint sooner.

**Everything an action carries lives INSIDE `event`.** `name`, `context` and
`userMessage` are all keys of `event` — never siblings of it:

```
CORRECT  {"event":{"name":"saved","context":{"id":"a1"},"userMessage":"Saved the draft"}}
INVALID  {"event":{"name":"saved"},"context":{"id":"a1"}}
```

Hoisting any of them out of `event` makes the action invalid and it will be
rejected. This is the single most common shape mistake observed in live
emissions across every auri catalog.

`event` accepts **only** those three keys. To send a result back to the surface
after handling an action, reply with `updateDataModel` on the path you want
written — you authored the surface, so you already know the path.

## Components

### TextField — one line of text

| prop          | type                                              | required | notes                                               |
| ------------- | ------------------------------------------------- | -------- | --------------------------------------------------- |
| `label`       | string                                            | yes      | visible label and accessible name                   |
| `value`       | `{"path"}`                                        | yes      | where the answer lives; always a binding            |
| `kind`        | `"text" \| "email" \| "url" \| "tel" \| "secret"` | no       | input treatment + mobile keyboard; default `"text"` |
| `placeholder` | string                                            | no       | example content, never a label substitute           |
| `hint`        | string                                            | no       | one line of help under the field                    |
| `checks`      | check[]                                           | no       | see rule 3                                          |

```
{"id":"email","component":"TextField","label":"Work email","kind":"email","value":{"path":"/contact/email"},"hint":"We only use this for receipts.","checks":[{"condition":{"call":"required"},"message":"Enter your email."},{"condition":{"call":"email"},"message":"That doesn't look like an email address."}]}
```

### TextArea — multi-line text

| prop          | type       | required | notes                                   |
| ------------- | ---------- | -------- | --------------------------------------- |
| `label`       | string     | yes      | visible label and accessible name       |
| `value`       | `{"path"}` | yes      | always a binding                        |
| `rows`        | number     | no       | visible lines; default `3`              |
| `maxLength`   | number     | no       | shows a live character counter when set |
| `placeholder` | string     | no       |                                         |
| `hint`        | string     | no       |                                         |
| `checks`      | check[]    | no       | `length` with `{"min"}` pairs well here |

```
{"id":"details","component":"TextArea","label":"What happened?","value":{"path":"/report/details"},"rows":5,"maxLength":2000,"checks":[{"condition":{"call":"length","args":{"min":30}},"message":"A sentence or two more helps us reproduce it."}]}
```

### NumberField — a number with bounds and a unit

| prop     | type       | required | notes                                             |
| -------- | ---------- | -------- | ------------------------------------------------- |
| `label`  | string     | yes      | visible label and accessible name                 |
| `value`  | `{"path"}` | yes      | always a binding; the answer is a raw number      |
| `min`    | number     | no       |                                                   |
| `max`    | number     | no       |                                                   |
| `step`   | number     | no       | increment granularity; default `1`                |
| `unit`   | string     | no       | `"GB"`, `"%"`, or a currency code like `"USD"`    |
| `hint`   | string     | no       |                                                   |
| `checks` | check[]    | no       | `numeric` with `{"min"}`/`{"max"}` mirrors bounds |

```
{"id":"replicas","component":"NumberField","label":"Replica count","value":{"path":"/svc/replicas"},"min":1,"max":20,"hint":"Production runs at least 2.","checks":[{"condition":{"call":"numeric","args":{"min":1,"max":20}},"message":"Choose between 1 and 20 replicas."}]}
```

### SelectField — one of many, compact

| prop          | type       | required | notes                                                       |
| ------------- | ---------- | -------- | ----------------------------------------------------------- |
| `label`       | string     | yes      | visible label and accessible name                           |
| `value`       | `{"path"}` | yes      | binds the chosen option's `value`                           |
| `options`     | option[]   | yes      | `{"value","label"}` objects, or bare strings when identical |
| `placeholder` | string     | no       | prompt before a choice, e.g. `"Choose a region…"`           |
| `hint`        | string     | no       |                                                             |
| `checks`      | check[]    | no       | `required` makes the choice mandatory                       |

```
{"id":"region","component":"SelectField","label":"Region","value":{"path":"/svc/region"},"placeholder":"Choose a region…","options":[{"value":"eu-west-1","label":"Europe (Ireland)"},{"value":"us-east-1","label":"US East (Virginia)"}],"checks":[{"condition":{"call":"required"},"message":"Pick a region."}]}
```

### RadioGroup — one of a few, all visible

Same shape as SelectField minus `placeholder`. Use for 2–6 options; SelectField beyond that.

```
{"id":"severity","component":"RadioGroup","label":"Severity","value":{"path":"/report/severity"},"options":[{"value":"sev1","label":"Sev 1 — total outage"},{"value":"sev2","label":"Sev 2 — degraded"},{"value":"sev3","label":"Sev 3 — cosmetic"}],"checks":[{"condition":{"call":"required"},"message":"Choose a severity."}]}
```

### CheckboxGroup — many of a few

The bound value is an **array of strings**. Seed it (usually `[]`) with `updateDataModel`.

| prop      | type       | required | notes                              |
| --------- | ---------- | -------- | ---------------------------------- |
| `label`   | string     | yes      | group label and accessible name    |
| `value`   | `{"path"}` | yes      | binds a string array               |
| `options` | option[]   | yes      |                                    |
| `hint`    | string     | no       |                                    |
| `checks`  | check[]    | no       | `required` = at least one selected |

```
{"id":"channels","component":"CheckboxGroup","label":"Notify via","value":{"path":"/prefs/channels"},"options":["Email","Slack","PagerDuty"],"hint":"Pick any."}
```

### Toggle — a single yes/no

| prop    | type       | required | notes                                               |
| ------- | ---------- | -------- | --------------------------------------------------- |
| `label` | string     | yes      | state it positively: `"Email me a copy"`            |
| `value` | `{"path"}` | yes      | binds a boolean; seed the default in the data model |
| `hint`  | string     | no       |                                                     |

```
{"id":"copy_me","component":"Toggle","label":"Email me a copy","value":{"path":"/prefs/emailCopy"}}
```

### DateField — an ISO date

| prop     | type       | required | notes                              |
| -------- | ---------- | -------- | ---------------------------------- |
| `label`  | string     | yes      | visible label and accessible name  |
| `value`  | `{"path"}` | yes      | binds an ISO 8601 date string      |
| `min`    | string     | no       | earliest selectable date, ISO 8601 |
| `max`    | string     | no       | latest selectable date, ISO 8601   |
| `hint`   | string     | no       |                                    |
| `checks` | check[]    | no       |                                    |

```
{"id":"start","component":"DateField","label":"Start date","value":{"path":"/leave/start"},"min":"2026-08-20","checks":[{"condition":{"call":"required"},"message":"Pick a start date."}]}
```

### FormSection — a titled group of fields

The only component with children. Sections structure long forms; short forms don't need one.

| prop          | type   | required | notes                                  |
| ------------- | ------ | -------- | -------------------------------------- |
| `title`       | string | yes      | section heading                        |
| `description` | string | no       | one or two sentences under the heading |
| `children`    | id[]   | yes      | ComponentIds of the fields, in order   |

```
{"id":"contact","component":"FormSection","title":"Contact details","description":"How we reach you about this report.","children":["name","email"]}
```

### SubmitBar — submit (and cancel) with pending state

Submission fires only when every check on the surface passes. Hand-pick the answers you need into
`context`. To report a server-side verdict afterwards, reply with `updateDataModel` on the path you
want written — bind a `Callout` or the field's own error to that path when you build the form.

| prop           | type       | required | notes                                                          |
| -------------- | ---------- | -------- | -------------------------------------------------------------- |
| `submitAction` | action     | yes      | `{"event":{"name","context",...}}`; name it after what happens |
| `submitLabel`  | string     | no       | e.g. `"Create account"`; default localized "Submit"            |
| `cancelAction` | action     | no       | renders a quiet cancel button                                  |
| `cancelLabel`  | string     | no       |                                                                |
| `pending`      | `{"path"}` | no       | bind and set true while you process; the bar disables          |

```
{"id":"submit","component":"SubmitBar","submitLabel":"File report","pending":{"path":"/report/pending"},"submitAction":{"event":{"name":"report_filed","context":{"severity":{"path":"/report/severity"},"details":{"path":"/report/details"}}}}}
```

## Mixing with the basic catalog

Layout containers (`Row`, `Column`, `Card`) come from the A2UI basic catalog. When the surface's
`catalogId` is the forms catalog, give basic-catalog components an explicit `catalogId`:

```
{"id":"root","component":"Column","catalogId":"https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json","children":["intro","email","submit"]}
```

The same works for any other catalog — an ops `Callout` above a form is the right way to explain
why you're asking, and an ops `Callout` bound to a server-error path is the right way to show a
submission verdict.

## A complete example

An incident report: seeded defaults, live validation, components in two short batches (rule 6),
a submit that carries exactly the answers needed, and a pending flag the agent flips while filing.

```
{"version":"v1.0","createSurface":{"surfaceId":"report","catalogId":"https://chaliceforauri.github.io/auri/catalogs/forms/v2.json"}}
{"version":"v1.0","updateDataModel":{"surfaceId":"report","value":{"severity":"sev2","details":"","pending":false}}}
{"version":"v1.0","updateComponents":{"surfaceId":"report","components":[{"id":"root","component":"Column","catalogId":"https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json","children":["severity","details","submit"]},{"id":"severity","component":"RadioGroup","label":"Severity","value":{"path":"/severity"},"options":[{"value":"sev1","label":"Sev 1 — total outage"},{"value":"sev2","label":"Sev 2 — degraded"},{"value":"sev3","label":"Sev 3 — cosmetic"}],"checks":[{"condition":{"call":"required"},"message":"Choose a severity."}]}]}}
{"version":"v1.0","updateComponents":{"surfaceId":"report","components":[{"id":"details","component":"TextArea","label":"What happened?","value":{"path":"/details"},"rows":5,"checks":[{"condition":{"call":"length","args":{"min":30}},"message":"A sentence or two more helps us reproduce it."}]},{"id":"submit","component":"SubmitBar","submitLabel":"File report","pending":{"path":"/pending"},"submitAction":{"event":{"name":"report_filed","context":{"severity":{"path":"/severity"},"details":{"path":"/details"}}}}}]}}
{"version":"v1.0","updateDataModel":{"surfaceId":"report","path":"/pending","value":true}}
```
