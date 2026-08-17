# The auri design language

_Authoritative for how auri components look, move, and degrade. When a contract sketch and this
document disagree, this document wins. Draft — iterate here, not in component code._

## 0. The stance

auri is **one authored opinion**, not a synthesis. We borrow principles, never looks:

- from **Material**: motion has meaning — things enter from where they came from, and nothing moves
  without communicating something;
- from **Apple**: spring physics and interruptibility — motion feels like matter, and a stream that
  updates mid-animation retargets instead of snapping;
- from **shadcn**: restraint — a neutral ground, few accents, and the discipline to say no.

The test for any visual decision: does it survive being streamed in piece by piece and still feel
like one hand drew it?

## 1. The intent scale

One semantic scale, used identically by every component that expresses judgment:

| Intent    | Meaning                               | Typical use                       |
| --------- | ------------------------------------- | --------------------------------- |
| `good`    | healthy, succeeding, positive         | uptime stat, passing deploy badge |
| `bad`     | failing, dangerous, critical          | error-rate stat, failed job badge |
| `warning` | needs attention, degraded, in-flight  | canary badge, mitigation callout  |
| `info`    | informational emphasis, no judgment   | scheduled-maintenance callout     |
| `neutral` | no semantic claim (the resting state) | any value the agent isn't judging |

Rules:

- **Default is the component's resting semantic**: `neutral` for Stat and Badge, `info` for Callout
  (a callout exists to call attention; informational is its resting state). Documented per
  component; never anything outside the scale.
- **`intent` judges, `trend` describes.** `trend: 'up'` on a latency Stat with `intent: 'bad'` is
  the canonical example — direction and judgment are independent axes, and conflating them is the
  most common vocabulary-design mistake in dashboards.
- **Intent implies iconography.** A `warning` Callout gets the warning glyph from the theme;
  components do not take arbitrary `icon` props. This keeps the wire semantic, the glyph set
  consistent, and every intent glyph paired with a text alternative for assistive tech.
- Intent props accept Dynamic values (`{path}`), so a badge can flip from `warning` to `good`
  through `updateDataModel` without re-sending the component.

## 2. Color

- Tokens only, no literals in components: `--a2ui-*` base tokens stay authoritative for
  ground/text/spacing/type so ops components look native beside basic-catalog components;
  `--auri-intent-good/bad/warning/info/neutral` (plus subdued surface variants) are the additions.
- Light and dark ship together, keyed off the renderer's `.a2ui-dark` class, all at `:where()`
  zero specificity so any host stylesheet wins.
- Intent colors are **accents on a neutral ground** — a dashboard that judges everything judges
  nothing. Most of any surface is neutral; intent appears where the agent made a claim.
- Contrast: WCAG 2.2 AA minimum in both themes, checked in CI eventually. `forced-colors` mode
  maps intents to system colors; `prefers-contrast: more` thickens borders rather than shifting hue.

## 3. Type and density

- **Inherit the host's font. Ship none.** auri has a type _scale_, not a typeface: value (the big
  number), label, caption — three roles, tokenized sizes/weights.
- Numbers use `font-variant-numeric: tabular-nums` wherever they can update in place — streaming
  values must not jiggle their neighbors.
- Default density is comfortable; a `compact` surface-level mode is a roadmap item, not a per-prop.

## 4. Motion (the hero system)

Tokens live in `@aurilabs/core`:

- **Durations**: `--auri-motion-fast` ~120ms (micro state changes: badge intent flip, delta
  update), `--auri-motion-base` ~240ms (component entrance), `--auri-motion-slow` ~400ms
  (choreographed sequences).
- **Curves**: entrances decelerate (spring, slight overshoot on transform only — never on
  opacity); exits accelerate; in-place value changes cross-fade.
- **Entrance**: fade + 8px rise, staggered ~40ms per sibling as a stream batch paints. The
  entrance is the brand.
- **Zero CLS**: entrances animate `transform`/`opacity` only — components reserve their layout
  immediately. A streaming surface never shoves content the user is reading.
- **Interruptibility**: a value that updates mid-transition retargets from its current animated
  position; nothing snaps, nothing queues.
- **`prefers-reduced-motion`**: opacity-only fades at `--auri-motion-fast`, stagger dropped. Not
  "no feedback" — no movement.

## 5. The in-between states

Every component whose props can bind to paths defines all three, in the contract's terms:

- **Skeleton**: the bound path doesn't resolve yet (data hasn't arrived). Component-shaped
  shimmer, exact final dimensions — the skeleton is the CLS reservation.
- **Empty**: the path resolves to an empty collection or empty string. A designed quiet state,
  never a blank hole; components may document an `emptyText`-style prop where it earns its place.
- **Error**: the path resolves to something type-invalid. Render the neutral resting state,
  log a console warning — never throw, never render garbage. (Same philosophy as the renderer:
  log and skip.)

## 6. Internationalization

- Raw values on the wire; components format via `Intl.NumberFormat` / `Intl.DateTimeFormat` /
  `Intl.RelativeTimeFormat` in the host locale. Units render through `Intl` where it supports
  them; free-text units render as given.
- All layout in CSS logical properties (`margin-inline-start`, not `margin-left`); RTL is a
  first-run concern, not a retrofit. Trend arrows and directional glyphs flip with direction.
- Agent-authored text (labels, callout bodies) is the agent's language — the catalog never
  translates; it only formats data.

## 7. Accessibility

- The contract requires what assistive tech requires: `label` on Stat, `text` on Badge and
  Callout — a component cannot be emitted without its accessible name. `ariaLabel` (from
  ComponentCommon) overrides when visible text isn't the whole story.
- Interactive semantics (focus traps, roving focus, confirm flows) delegate to bits-ui; display
  components use correct native elements (`dl` for KeyValue, `table` for DataTable, `figure` +
  described charts).
- Charts and sparklines always carry a text alternative derived from their data — the summary is
  generated, not optional.
- Focus is always visible; nothing keyboard-reachable is pointer-only; WCAG 2.2 target sizes on
  anything clickable.

## 8. Writing voice (microcopy)

Anything auri itself renders (empty states, confirm labels, copy buttons in docs): plain,
lowercase-calm, no exclamation marks, no "oops". The agent brings the drama; the furniture stays
quiet.
