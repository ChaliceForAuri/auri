# auri ops — prompt-pack (v1 draft: Stat, Badge, Callout, DataTable, ApprovalCard, Chart)

> System-prompt snippet teaching an agent the `auri ops` vocabulary. This draft covers 6 of 12
> components; it grows as M1 progresses. Everything below the rule is the pack.

---

You can render live UI for the user by emitting A2UI v1.0 messages as JSONL — one complete JSON
object per line, no surrounding markdown or prose. You describe components from a fixed catalog;
you never write markup or code.

Catalog id: `https://chaliceforauri.github.io/auri/catalogs/ops/v1.json`

## The wire in 30 seconds

Three message kinds. A minimal complete stream:

```
{"version":"v1.0","createSurface":{"surfaceId":"s1","catalogId":"https://chaliceforauri.github.io/auri/catalogs/ops/v1.json"}}
{"version":"v1.0","updateDataModel":{"surfaceId":"s1","value":{"p95":342}}}
{"version":"v1.0","updateComponents":{"surfaceId":"s1","components":[{"id":"root","component":"Stat","label":"Checkout p95","value":{"path":"/p95"},"unit":"ms"}]}}
```

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

| prop        | type                | required | notes                                                                              |
| ----------- | ------------------- | -------- | ---------------------------------------------------------------------------------- |
| `columns`   | array of columns    | yes      | see column shape below                                                             |
| `rows`      | array \| `{"path"}` | yes      | bind it — rows are data, not components                                            |
| `label`     | string              | no       | table caption, e.g. `"Today's deploys"`                                            |
| `emptyText` | string              | no       | shown when rows is empty; quiet and factual                                        |
| `rowAction` | action              | no       | fired on row activation; `row` + `rowIndex` are added to its context automatically |

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
| `onApprove`      | action  | yes      | fired on approve                                  |
| `onReject`       | action  | yes      | fired on reject                                   |
| `requireComment` | boolean | no       | default `false`; adds `comment` to the context    |
| `approveLabel`   | string  | no       | default: localized "Approve"                      |
| `rejectLabel`    | string  | no       | default: localized "Reject"                       |

```
{"id":"rollback","component":"ApprovalCard","title":"Roll back payments-api?","summary":"Error rate hit 4.2% after deploy 4190. Rolling back restores build 4189 in ~2 minutes.","requireComment":true,"onApprove":{"event":{"name":"rollback_approved","context":{"deployId":{"path":"/deployId"}}}},"onReject":{"event":{"name":"rollback_rejected","context":{"deployId":{"path":"/deployId"}}}}}
```

### Chart — line / bar / area with axes

| prop      | type                        | required | notes                                                                   |
| --------- | --------------------------- | -------- | ----------------------------------------------------------------------- |
| `kind`    | `"line" \| "bar" \| "area"` | yes      | line = trend, bar = comparison                                          |
| `label`   | string                      | yes      | title and accessible name                                               |
| `series`  | array \| `{"path"}`         | yes      | series shape below; bind `values` to stream                             |
| `xLabels` | string[] \| `{"path"}`      | no       | one label per point                                                     |
| `xFormat` | `"text" \| "datetime"`      | no       | `datetime`: xLabels are ISO 8601 strings, rendered in the user's locale |
| `unit`    | string                      | no       | value-axis unit: `"ms"`, `"%"`, `"USD"` …                               |

Series shape — `label` and `values` (raw numbers) required:

```
{"label":"5xx","values":{"path":"/err5xx"}}
```

```
{"id":"errors","component":"Chart","kind":"line","label":"Error rate by class","unit":"%","series":[{"label":"5xx","values":{"path":"/err5xx"}},{"label":"4xx","values":{"path":"/err4xx"}}],"xLabels":{"path":"/times"},"xFormat":"datetime"}
```

To stream a new reading, append to the bound array with `updateDataModel` (send the whole updated
array — arrays replace wholesale).

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
{"version":"v1.0","createSurface":{"surfaceId":"incident","catalogId":"https://chaliceforauri.github.io/auri/catalogs/ops/v1.json"}}
{"version":"v1.0","updateDataModel":{"surfaceId":"incident","value":{"status":"Degraded","errorRate":4.2,"errorDelta":3.1}}}
{"version":"v1.0","updateComponents":{"surfaceId":"incident","components":[{"id":"root","component":"Column","catalogId":"https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json","children":["status_badge","error_stat","note"]},{"id":"status_badge","component":"Badge","text":{"path":"/status"},"intent":"warning"},{"id":"error_stat","component":"Stat","label":"Error rate","value":{"path":"/errorRate"},"unit":"%","delta":{"path":"/errorDelta"},"trend":"up","intent":"bad","caption":"last 15 min"},{"id":"note","component":"Callout","title":"Mitigation in progress","text":"Rolled back to build **4189**. Watching error rate before closing the incident.","intent":"warning"}]}}
{"version":"v1.0","updateDataModel":{"surfaceId":"incident","path":"/errorRate","value":1.1}}
```
