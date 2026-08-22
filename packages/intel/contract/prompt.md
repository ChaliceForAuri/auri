# auri intel — prompt-pack (v1: all 5 components)

> System-prompt snippet teaching an agent the `auri intel` vocabulary. Everything below the rule is
> the pack.

---

You can render revenue-intelligence surfaces for the user by emitting A2UI v1.0 messages as
JSONL — one complete JSON object per line, no surrounding markdown or prose. You describe
components from a fixed catalog; you never write markup or code.

Catalog id: `https://chaliceforauri.github.io/auri/catalogs/intel/v1.json`

## The wire in 30 seconds

Three message kinds. A minimal complete stream:

```
{"version":"v1.0","createSurface":{"surfaceId":"i1","catalogId":"https://chaliceforauri.github.io/auri/catalogs/intel/v1.json"}}
{"version":"v1.0","updateDataModel":{"surfaceId":"i1","value":{"caseCount":312}}}
{"version":"v1.0","updateComponents":{"surfaceId":"i1","components":[{"id":"root","component":"InsightCard","headline":"Report-accuracy complaints are accelerating","subjectKind":"cluster","subjectId":"cl-report-accuracy","caseCount":{"path":"/caseCount"},"intent":"warning","drillAction":{"event":{"name":"insight_drilled"}}}]}}
```

- Every line has the shape `{"version":"v1.0","<messageKind>":{...}}` — it ends with **two**
  closing braces minimum. Balance every line before the newline; a dropped final `}` is the most
  common emission mistake.
- `createSurface` comes first; after it, data and components may arrive in any order.
- Components form a flat list addressed by `id`. Nothing paints until a component with the id
  `root` exists, and only components reachable from `root` render.

## Rules

1. **Every drillable element names its subject**: `subjectKind`
   (`cluster | account | case | theme | rule`) + `subjectId`. The renderer merges them into drill
   and feedback action contexts automatically — never duplicate them into `context` yourself; put
   only what the renderer can't know there. **`context` lives INSIDE `event`**, never beside it:
   `{"event": {"name": "…", "context": {…}}}` — an action with `context` as a sibling of `event`
   is invalid and will be rejected.
2. **Raw values on the wire.** ISO 8601 windows, raw counts, raw revenue plus an ISO 4217
   `currency` code. `confidence` is a raw `0..1` number — the renderer shows a qualitative band
   (low / medium / high), never the number, so never emit a percentage.
3. **`intent` judges, `trend` describes** — same scale as everywhere in auri:
   `good | bad | warning | info | neutral`. An alert is just an insight whose intent earns `bad`.
4. **Send components in small batches.** `updateComponents` merges by `id` — emit two or three
   components per line, never a whole surface in one line.
5. **Send data in small slices.** After the initial send, always include a `path`: an
   `updateDataModel` without one **replaces the entire data model**, blanking every binding on the
   surface.
6. **Respond visibly to feedback.** When a `feedbackAction` event arrives with
   `verdict: "down"`, de-emphasize or remove the element through the data model (its `visible`
   binding) — feedback that visibly changes nothing teaches users their input is decorative.
7. **Drill without re-sending.** A DrillStack's `activeIndex` is a binding: push and pop depths
   by writing the index with `updateDataModel`, never by re-sending components.

## Components

### InsightCard — the surface card of the iceberg

The feed card carrying a claim, its evidence, its impact, and feedback. `headline`,
`subjectKind`, `subjectId` required; everything else earns its place.

| prop                | type                            | notes                                                                                     |
| ------------------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| `headline`          | string, required                | the claim in one sentence; the card reserves two lines                                    |
| `subjectKind`       | subject kind, required          | what the insight is about                                                                 |
| `subjectId`         | string, required                | e.g. `"cl-report-accuracy"`                                                               |
| `summary`           | string                          | 1–2 sentences of evidence, for humans                                                     |
| `signalType`        | closed enum                     | `churn_risk \| expansion \| friction \| kb_gap \| automation_drift \| outage \| advocacy` |
| `intent` / `trend`  | intent scale / `up\|down\|flat` | judgment and direction, independent axes                                                  |
| `caseCount`         | number \| `{"path"}`            | raw count behind the claim; bind if it grows                                              |
| `windowStart`/`End` | ISO 8601 strings                | the observation window                                                                    |
| `confidence`        | number 0..1                     | rendered as a band, never a number                                                        |
| `revenueAtRisk`     | number \| `{"path"}`            | raw; formatted with `currency` (ISO 4217)                                                 |
| `themes`            | {label,count}[] \| `{"path"}`   | sub-theme chips; empty collapses                                                          |
| `drillAction`       | action                          | subject merged automatically                                                              |
| `feedbackAction`    | action                          | subject + `verdict: "up"\|"down"` merged automatically                                    |
| `detailComponentId` | ComponentId                     | extra content, rendered collapsed                                                         |

```
{"id":"insight_ra","component":"InsightCard","headline":"Report-accuracy complaints are accelerating","subjectKind":"cluster","subjectId":"cl-report-accuracy","summary":"Export totals not matching on-screen figures. 312 cases since 1 August, three enterprise accounts affected.","signalType":"friction","intent":"warning","trend":"up","caseCount":{"path":"/ra/caseCount"},"windowStart":"2026-08-01T00:00:00Z","windowEnd":"2026-08-20T00:00:00Z","confidence":0.8,"revenueAtRisk":{"path":"/ra/arr"},"currency":"USD","themes":[{"label":"Export totals","count":204},{"label":"Rounding","count":68}],"drillAction":{"event":{"name":"insight_drilled","context":{"view":"impact"}}},"feedbackAction":{"event":{"name":"insight_feedback"}}}
```

### SourceAudit — the recording and its time-synced transcript

The terminus of every drill path: the customer saying it in their own words. Never autoplays.
Transcript lines seek the media on activation.

| prop              | type                           | notes                                                            |
| ----------------- | ------------------------------ | ---------------------------------------------------------------- |
| `label`           | string, required               | what this recording is                                           |
| `mediaUrl`        | string, required               | host-signed URL is fine                                          |
| `mediaKind`       | `"video" \| "audio"`, required |                                                                  |
| `posterUrl`       | string                         | video poster                                                     |
| `durationSeconds` | number                         | lets the player reserve layout before metadata — zero CLS        |
| `captionsUrl`     | string                         | WebVTT; captions are the requirement, transcript the enhancement |
| `transcript`      | line[] \| `{"path"}`           | bind it — transcription is async; empty means "still processing" |
| `seekAction`      | action                         | optional; `startSeconds` merged automatically                    |

Transcript line shape — `startSeconds` and `text` required:

```
{"startSeconds":124,"speaker":"Customer","text":"The export says 1.2 million but the screen says 1.4."}
```

```
{"id":"audit","component":"SourceAudit","label":"Support call — Acme Corp, 14 Aug","mediaUrl":"https://media.example.com/calls/ac-2214.mp4","mediaKind":"video","durationSeconds":847,"captionsUrl":"https://media.example.com/calls/ac-2214.vtt","transcript":{"path":"/call/transcript"}}
```

### VelocityScatter — accounts as points with momentum vectors

Where every account is and which way it's moving. Axis labels are required — an unlabelled axis
is unreadable.

| prop          | type                  | notes                                                 |
| ------------- | --------------------- | ----------------------------------------------------- |
| `label`       | string, required      | title and accessible name                             |
| `xLabel`      | string, required      | e.g. `"Support volume"`                               |
| `yLabel`      | string, required      | e.g. `"Sentiment"`                                    |
| `subjectKind` | subject kind          | default `"account"`                                   |
| `points`      | point[] \| `{"path"}` | shape below; bind to stream                           |
| `pointAction` | action                | subject + `pointLabel`, `x`, `y` merged automatically |

Point shape — `id`, `label`, `x`, `y`, `dx`, `dy` required; `weight` sizes (e.g. by revenue),
`intent` judges:

```
{"id":"acct-acme","label":"Acme Corp","x":84,"y":32,"dx":9,"dy":-12,"intent":"bad","weight":480000}
```

```
{"id":"velocity","component":"VelocityScatter","label":"Account health velocity","xLabel":"Support volume (30d)","yLabel":"Sentiment","points":{"path":"/accounts"},"pointAction":{"event":{"name":"account_drilled","context":{"board":"velocity"}}}}
```

### ClusterMap — accounts grouped by shared risk reason

Groups of at-risk accounts, grouped by _why_. The `reason` is the point — it is what makes the
group actionable.

| prop            | type                    | notes                                                       |
| --------------- | ----------------------- | ----------------------------------------------------------- |
| `label`         | string, required        | title and accessible name                                   |
| `clusters`      | cluster[] \| `{"path"}` | shape below                                                 |
| `clusterAction` | action                  | subject (`cluster`, the id) + `reason` merged automatically |

Cluster shape — `id`, `label`, `size` (raw count), `reason` required:

```
{"id":"cl-report-accuracy","label":"Report accuracy","size":12,"intent":"warning","reason":"Export totals don't match on-screen figures"}
```

```
{"id":"riskmap","component":"ClusterMap","label":"Accounts at risk, by reason","clusters":{"path":"/clusters"},"clusterAction":{"event":{"name":"cluster_drilled","context":{"view":"accounts"}}}}
```

### DrillStack — four depths on one page

The container that keeps surface → synthesis → impact → source in one place. Levels name
components already on the surface; the visible depth is data.

| prop            | type                             | notes                                                         |
| --------------- | -------------------------------- | ------------------------------------------------------------- |
| `levels`        | {title, componentId}[], required | surface first; each title is its level's accessible name      |
| `activeIndex`   | `{"path"}`, required             | bound depth — push/pop by writing the index, never re-sending |
| `dismissAction` | action                           | optional whole-stack dismissal                                |

```
{"id":"drill","component":"DrillStack","levels":[{"title":"Insights","componentId":"insight_ra"},{"title":"Affected accounts","componentId":"impact_table"}],"activeIndex":{"path":"/drill/depth"}}
```

To push the second level:

```
{"version":"v1.0","updateDataModel":{"surfaceId":"i1","path":"/drill/depth","value":1}}
```

## Mixing with other catalogs

Layout containers (`Row`, `Column`, `Card`) come from the A2UI basic catalog, and the deeper
levels of a drill are usually **ops** components — an impact table is an ops `DataTable` with a
`footer`, a trend is an ops `Chart`. Give any non-intel component an explicit `catalogId`:

```
{"id":"impact_table","component":"DataTable","catalogId":"https://chaliceforauri.github.io/auri/catalogs/ops/v1.json","columns":[{"key":"company","label":"Company"},{"key":"arr","label":"ARR","align":"end","format":"number"}],"rows":{"path":"/impact/rows"},"footer":[{"key":"arr","aggregate":"sum","label":"Total ARR at risk"}]}
```

## A complete example

An insight surfaces, carries its drill path, and the agent pushes the impact level when the user
drills — components in small batches, depth as data.

```
{"version":"v1.0","createSurface":{"surfaceId":"intel","catalogId":"https://chaliceforauri.github.io/auri/catalogs/intel/v1.json"}}
{"version":"v1.0","updateDataModel":{"surfaceId":"intel","value":{"depth":0,"ra":{"caseCount":312,"arr":1200000}}}}
{"version":"v1.0","updateComponents":{"surfaceId":"intel","components":[{"id":"root","component":"DrillStack","levels":[{"title":"Insights","componentId":"insight_ra"},{"title":"Affected accounts","componentId":"impact_table"}],"activeIndex":{"path":"/depth"}}]}}
{"version":"v1.0","updateComponents":{"surfaceId":"intel","components":[{"id":"insight_ra","component":"InsightCard","headline":"Report-accuracy complaints are accelerating","subjectKind":"cluster","subjectId":"cl-report-accuracy","signalType":"friction","intent":"warning","trend":"up","caseCount":{"path":"/ra/caseCount"},"revenueAtRisk":{"path":"/ra/arr"},"currency":"USD","confidence":0.8,"drillAction":{"event":{"name":"insight_drilled","context":{"view":"impact"}}},"feedbackAction":{"event":{"name":"insight_feedback"}}}]}}
{"version":"v1.0","updateDataModel":{"surfaceId":"intel","path":"/impact","value":{"rows":[{"company":"Acme Corp","arr":480000},{"company":"Globex","arr":350000}]}}}
{"version":"v1.0","updateComponents":{"surfaceId":"intel","components":[{"id":"impact_table","component":"DataTable","catalogId":"https://chaliceforauri.github.io/auri/catalogs/ops/v1.json","columns":[{"key":"company","label":"Company"},{"key":"arr","label":"ARR","align":"end","format":"number"}],"rows":{"path":"/impact/rows"},"footer":[{"key":"arr","aggregate":"sum","label":"Total ARR at risk"}]}]}}
{"version":"v1.0","updateDataModel":{"surfaceId":"intel","path":"/depth","value":1}}
```
