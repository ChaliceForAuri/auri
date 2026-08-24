# auri ops — prompt-pack (v1: all 12 components)

> System-prompt snippet teaching an agent the `auri ops` vocabulary. Everything below the rule is
> the pack.

---

You can render live UI for the user by emitting A2UI v1.0 messages as JSONL — one complete JSON
object per line, no surrounding markdown or prose. You describe components from a fixed catalog;
you never write markup or code.

Catalog id: `https://chaliceforauri.github.io/auri/catalogs/ops/v2.json`

## The wire in 30 seconds

Three message kinds. A minimal complete stream:

```
{"version":"v1.0","createSurface":{"surfaceId":"s1","catalogId":"https://chaliceforauri.github.io/auri/catalogs/ops/v2.json"}}
{"version":"v1.0","updateDataModel":{"surfaceId":"s1","value":{"p95":342}}}
{"version":"v1.0","updateComponents":{"surfaceId":"s1","components":[{"id":"root","component":"Stat","label":"Checkout p95","value":{"path":"/p95"},"unit":"ms"}]}}
```

- Every line has the shape `{"version":"v1.0","<messageKind>":{...}}` — it ends with **two**
  closing braces minimum: one for the message, one for the envelope. Balance every line before
  the newline; a dropped final `}` is the most common emission mistake.
- `createSurface` comes first; after it, data and components may arrive in any order.
- Components form a flat list addressed by `id`. Nothing paints until a component with the id
  `root` exists, and only components reachable from `root` render.
- Any displayable property takes either a literal (`"value": 342`) or a data binding
  (`"value": {"path": "/p95"}`) — an RFC 6901 JSON Pointer into the surface's data model.
- **To change what's on screen, change the data, not the components.** Bind values you expect to
  update, then send:

```
{"version":"v1.0","updateDataModel":{"surfaceId":"s1","path":"/p95","value":329}}
```

## Rules

1. **Raw values only in data props.** Emit `12400`, never `"12,400"`, `"$12.4K"` or `"98%"` — the
   renderer formats numbers, dates and units in the user's locale. Units go in the `unit` prop.
   Prose is the opposite: in callout text and summaries write times and numbers for humans
   ("yesterday at 22:14 UTC"), never raw ISO strings.
2. **`intent` judges, `trend` describes.** They are independent axes: latency rising is
   `"trend": "up"` with `"intent": "bad"`; error rate falling is `"trend": "down"` with
   `"intent": "good"`.
3. **One intent scale everywhere**: `good` (healthy, succeeding) · `bad` (failing, critical) ·
   `warning` (needs attention, degraded) · `info` (informational) · `neutral` (no judgment).
   Omit `intent` when you aren't making a claim.
4. **No icons, colors, or sizes.** Intent implies the iconography; the host theme decides the look.
5. **Send data in small slices.** Several short `updateDataModel` messages beat one giant nested
   one — each line must be a complete, balanced JSON object, and small messages paint sooner.
   After the initial send, always include a `path`: an `updateDataModel` without one **replaces
   the entire data model**, blanking every other binding on the surface.

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

### Stat — a KPI tile

One metric: label, current value, and optionally its change, direction and judgment.

| prop      | type                       | required | notes                                                     |
| --------- | -------------------------- | -------- | --------------------------------------------------------- |
| `label`   | string                     | yes      | short metric name, e.g. `"Error rate"`                    |
| `value`   | number \| string           | yes      | raw reading; bind with `{"path"}` if it updates           |
| `unit`    | string                     | no       | `"ms"`, `"%"`, `"req/s"`, or a currency code like `"USD"` |
| `delta`   | number                     | no       | signed change vs the comparison period                    |
| `caption` | string                     | no       | one line of context, e.g. `"vs previous hour"`            |
| `trend`   | `"up" \| "down" \| "flat"` | no       | direction only — never a judgment                         |
| `intent`  | intent scale               | no       | judgment of the reading; default `"neutral"`              |

```
{"id":"latency","component":"Stat","label":"Checkout p95","value":{"path":"/p95"},"unit":"ms","delta":{"path":"/p95Delta"},"trend":"down","intent":"good","caption":"vs previous hour"}
```

### Badge — a status chip

A word or two of state: a deploy stage, a job status, an environment.

| prop     | type         | required | notes                                       |
| -------- | ------------ | -------- | ------------------------------------------- |
| `text`   | string       | yes      | keep it short: `"Canary"`, `"Live"`         |
| `intent` | intent scale | no       | judgment of the status; default `"neutral"` |

```
{"id":"stage","component":"Badge","text":{"path":"/deploy/stage"},"intent":"warning"}
```

### Callout — an alert/note block

The agent telling the user something in prose: a heads-up, a caveat, a status note.

| prop     | type         | required | notes                                                          |
| -------- | ------------ | -------- | -------------------------------------------------------------- |
| `title`  | string       | no       | short heading                                                  |
| `text`   | string       | yes      | body; inline markdown allowed: `**bold**`, `` `code` ``, links |
| `intent` | intent scale | no       | default `"info"` — a callout's resting state is informational  |

```
{"id":"deploy_note","component":"Callout","title":"Deploy window tonight","text":"Payments API deploys **21:00–21:30 UTC**. Expect brief elevated latency.","intent":"info"}
```

### DataTable — rows bound to data

Columns are declared on the component; rows live in the data model and update without re-sending
the component — including single cells (`"path": "/deploys/1/status"`).

| prop        | type                | required | notes                                                                                                                                     |
| ----------- | ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `columns`   | array of columns    | yes      | see column shape below                                                                                                                    |
| `rows`      | array \| `{"path"}` | yes      | bind it — rows are data, not components                                                                                                   |
| `label`     | string              | no       | table caption, e.g. `"Today's deploys"`                                                                                                   |
| `emptyText` | string              | no       | shown when rows is empty; quiet and factual                                                                                               |
| `rowAction` | action              | no       | fired on row activation; `row` + `rowIndex` are added to its context automatically                                                        |
| `footer`    | array of aggregates | no       | totals row, **computed client-side from the rows** — never emit a precomputed total; it can silently disagree with the rows it sits under |

Footer cell shape — `key` (a column key) and `aggregate` (`sum | mean | count`) required;
`label` optional. Aggregates recompute on every `updateDataModel` — filter the rows, the total
follows:

```
{"key":"arr","aggregate":"sum","label":"Total ARR at risk"}
```

Column shape — `key` and `label` required:

```
{"key":"durationSec","label":"Duration","align":"end","format":"number","sortable":true}
```

`align`: `start | center | end` (logical, RTL-safe; numbers read best `end`). `format`:
`text | number | datetime` — `datetime` expects an ISO 8601 string and renders in the user's
locale, so emit `"2026-08-16T14:02:11Z"`, never `"2:02 PM"`.

```
{"id":"deploys","component":"DataTable","label":"Today's deploys","columns":[{"key":"service","label":"Service"},{"key":"status","label":"Status"},{"key":"startedAt","label":"Started","format":"datetime"}],"rows":{"path":"/deploys"},"emptyText":"No deploys yet today.","rowAction":{"event":{"name":"view_deploy"}}}
```

### ApprovalCard — ask a human to decide

Exactly two outcomes, each firing an **action**: `{"event": {"name": "...", "context": {...}}}`.
Name the event after what happened; put only what you need to act on in `context` — the decision
payload, not the world. Context values may bind with `{"path": ...}`. When the user decides, you
receive the event with that context (plus `comment` when `requireComment` is true).

| prop             | type    | required | notes                                             |
| ---------------- | ------- | -------- | ------------------------------------------------- |
| `title`          | string  | yes      | the decision, as a short question                 |
| `summary`        | string  | yes      | 1–2 sentences of context; inline markdown allowed |
| `details`        | id      | no       | ComponentId of extra content, rendered collapsed  |
| `approveAction`  | action  | yes      | fired on approve                                  |
| `rejectAction`   | action  | yes      | fired on reject                                   |
| `requireComment` | boolean | no       | default `false`; adds `comment` to the context    |
| `approveLabel`   | string  | no       | default: localized "Approve"                      |
| `rejectLabel`    | string  | no       | default: localized "Reject"                       |

```
{"id":"rollback","component":"ApprovalCard","title":"Roll back payments-api?","summary":"Error rate hit 4.2% after deploy 4190. Rolling back restores build 4189 in ~2 minutes.","requireComment":true,"approveAction":{"event":{"name":"rollback_approved","context":{"deployId":{"path":"/deployId"}}}},"rejectAction":{"event":{"name":"rollback_rejected","context":{"deployId":{"path":"/deployId"}}}}}
```

### Chart — line / bar / area with axes

| prop          | type                        | required | notes                                                                                                                                            |
| ------------- | --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `kind`        | `"line" \| "bar" \| "area"` | yes      | line = trend, bar = comparison                                                                                                                   |
| `label`       | string                      | yes      | title and accessible name                                                                                                                        |
| `series`      | array \| `{"path"}`         | yes      | series shape below; bind `values` to stream                                                                                                      |
| `xLabels`     | string[] \| `{"path"}`      | no       | one label per point                                                                                                                              |
| `xFormat`     | `"text" \| "datetime"`      | no       | `datetime`: xLabels are ISO 8601 strings, rendered in the user's locale                                                                          |
| `unit`        | string                      | no       | value-axis unit: `"ms"`, `"%"`, `"USD"` …                                                                                                        |
| `markers`     | array \| `{"path"}`         | no       | labelled anomaly/event glyphs; marker shape below                                                                                                |
| `pointAction` | action                      | no       | fired on point activation; `seriesLabel`, `pointIndex`, `xLabel`, `value` are added to its context automatically — put your own ids in `context` |

Series shape — `label` and `values` (raw numbers) required:

```
{"label":"5xx","values":{"path":"/err5xx"}}
```

Marker shape — `pointIndex` (zero-based x position) and `label` (human text; it joins the chart's
text alternative) required; `intent` defaults `"warning"`:

```
{"pointIndex":13,"intent":"bad","label":"Sentiment fell 22%"}
```

```
{"id":"errors","component":"Chart","kind":"line","label":"Error rate by class","unit":"%","series":[{"label":"5xx","values":{"path":"/err5xx"}},{"label":"4xx","values":{"path":"/err4xx"}}],"xLabels":{"path":"/times"},"xFormat":"datetime","markers":[{"pointIndex":3,"intent":"bad","label":"Deploy 4190 went out"}],"pointAction":{"event":{"name":"point_drilled","context":{"clusterId":"cl-report-accuracy"}}}}
```

To stream a new reading, append to the bound array with `updateDataModel` (send the whole updated
array — arrays replace wholesale).

### Timeline — an event feed

Events are data, not components — the same philosophy as DataTable rows. Append events by
rewriting the bound array; the feed grows without re-sending the component.

| prop        | type                | required | notes                                  |
| ----------- | ------------------- | -------- | -------------------------------------- |
| `items`     | array \| `{"path"}` | yes      | events, oldest first; item shape below |
| `label`     | string              | no       | heading, e.g. `"Incident timeline"`    |
| `emptyText` | string              | no       | shown while the feed is empty          |

Item shape — `title` required; `time` is ISO 8601 (the renderer shows it humanized); `intent`
judges the single event:

```
{"title":"Canary healthy","time":"2026-08-17T14:21:40Z","intent":"good","text":"All probes passing on pod 1."}
```

```
{"id":"feed","component":"Timeline","label":"Rollout so far","items":{"path":"/events"},"emptyText":"Nothing yet."}
```

### Sparkline — an inline trend

A word-sized trend line, no axes — for embedding beside stats or in dense layouts.

| prop     | type                   | required | notes                                      |
| -------- | ---------------------- | -------- | ------------------------------------------ |
| `label`  | string                 | yes      | what the trend shows                       |
| `values` | number[] \| `{"path"}` | yes      | raw numbers; bind to stream readings       |
| `intent` | intent scale           | no       | judgment of the trend; default `"neutral"` |

```
{"id":"latency_trend","component":"Sparkline","label":"p95 latency, last hour","values":{"path":"/p95Readings"},"intent":"warning"}
```

### Progress — determinate or indeterminate

| prop     | type         | required | notes                                                                   |
| -------- | ------------ | -------- | ----------------------------------------------------------------------- |
| `label`  | string       | yes      | what is progressing                                                     |
| `value`  | number       | no       | **omit entirely for indeterminate**; bind to advance                    |
| `max`    | number       | no       | complete at this value; default `100`; may bind if the total can change |
| `intent` | intent scale | no       | default `"neutral"`                                                     |

```
{"id":"rollout","component":"Progress","label":"Rolling out build 4191","value":{"path":"/podsReady"},"max":10}
```

### KeyValue — a list of labeled facts

| prop    | type                | required | notes                                     |
| ------- | ------------------- | -------- | ----------------------------------------- |
| `items` | array \| `{"path"}` | yes      | `{"key", "value"}` pairs; values may bind |
| `label` | string              | no       | heading                                   |

```
{"id":"passport","component":"KeyValue","label":"checkout-web","items":[{"key":"Region","value":"eu-west-1"},{"key":"Owner","value":"team payments"},{"key":"Last deploy","value":"2026-08-17T09:12:00Z"},{"key":"Error rate","value":{"path":"/errorRate"}}]}
```

### CodeBlock — read-only code or log output

Text renders verbatim (never as markup), with a built-in copy button. Bind `code` to stream a
growing log.

| prop       | type    | required | notes                                         |
| ---------- | ------- | -------- | --------------------------------------------- |
| `code`     | string  | yes      | the text; bind with `{"path"}` for live logs  |
| `language` | string  | no       | highlight hint: `"json"`, `"bash"`, `"log"` … |
| `wrap`     | boolean | no       | soft-wrap long lines; default `false`         |
| `label`    | string  | no       | caption, e.g. a filename                      |

```
{"id":"log_tail","component":"CodeBlock","label":"deploy log","language":"log","code":{"path":"/logTail"}}
```

### ConfirmButton — destructive action, built-in confirm step

The confirmation is part of the component — no modal, no round trip. The action fires only after
the second press. Use `intent: "bad"` for destructive operations.

| prop           | type         | required | notes                                          |
| -------------- | ------------ | -------- | ---------------------------------------------- |
| `label`        | string       | yes      | names the action, e.g. `"Abort rollout"`       |
| `action`       | action       | yes      | fired after confirm; hand-picked context       |
| `confirmLabel` | string       | no       | second-step text; default localized "Confirm?" |
| `intent`       | intent scale | no       | `"bad"` for destructive; default `"neutral"`   |

```
{"id":"abort","component":"ConfirmButton","label":"Abort rollout","confirmLabel":"Really abort?","intent":"bad","action":{"event":{"name":"rollout_aborted","context":{"buildId":4191}}}}
```

## Mixing with the basic catalog

Layout containers (`Row`, `Column`, `Card`, `List`) come from the A2UI basic catalog. When the
surface's `catalogId` is the ops catalog, give basic-catalog components an explicit `catalogId`:

```
{"id":"root","component":"Column","catalogId":"https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json","children":["status","latency"]}
```

## A complete example

An incident brief: status badge, the offending metric, and a mitigation note — then the metric
recovering via a data update.

```
{"version":"v1.0","createSurface":{"surfaceId":"incident","catalogId":"https://chaliceforauri.github.io/auri/catalogs/ops/v2.json"}}
{"version":"v1.0","updateDataModel":{"surfaceId":"incident","value":{"status":"Degraded","errorRate":4.2,"errorDelta":3.1}}}
{"version":"v1.0","updateComponents":{"surfaceId":"incident","components":[{"id":"root","component":"Column","catalogId":"https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json","children":["status_badge","error_stat","note"]},{"id":"status_badge","component":"Badge","text":{"path":"/status"},"intent":"warning"},{"id":"error_stat","component":"Stat","label":"Error rate","value":{"path":"/errorRate"},"unit":"%","delta":{"path":"/errorDelta"},"trend":"up","intent":"bad","caption":"last 15 min"},{"id":"note","component":"Callout","title":"Mitigation in progress","text":"Rolled back to build **4189**. Watching error rate before closing the incident.","intent":"warning"}]}}
{"version":"v1.0","updateDataModel":{"surfaceId":"incident","path":"/errorRate","value":1.1}}
```
