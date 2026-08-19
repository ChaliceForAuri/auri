# The auri design language

_Authoritative for how auri components look, move, and degrade. When a contract sketch and this
document disagree, this document wins. Draft — iterate here, not in component code._

## 0. The stance — the Foundation direction (settled 2026-08-19)

auri's visual language is **shadcn/ui v4's neutral foundation, reseeded** (superseding the
one-day Tonal experiment — the ground truth was always quiet-crisp-neutral). The synthesis, all
open and credited:

- **Ground from shadcn/ui v4 (MIT)**: chroma-zero oklch neutrals, hairline borders in light,
  white-alpha borders and translucent fills in dark — depth from layered transparency, never
  tone. Radius 6/10/14. Content is the color.
- **Color is rare**: one brand accent (`--auri-seed`, indigo) for primary actions and focus, and
  the five intents as **colored text on soft tints** — full intent fills only at the loudest
  moments. Intent values from Tailwind's open scales.
- **The site's voice is Geist** (Vercel, SIL OFL, self-hosted); shipped catalog components still
  inherit the host's font — that principle never bends.
- **Delivered as plain CSS custom properties**, `:where()` zero specificity, no framework at
  runtime.

Brief: **clean, quiet, crisp — inspired is the bar.** Motion keeps Apple's interruptibility; the
discipline to say no is the whole point. The test for any visual decision: does it survive being
streamed in piece by piece and still feel like one hand drew it?

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

## 2. Color and surface

- **Roles, not colors**: components consume `--auri-surface`, `--auri-surface-container` (card),
  `--auri-surface-container-high` (muted fill), `--auri-on-surface(-variant)`,
  `--auri-outline-variant` (the hairline), `--auri-input-fill`, `--auri-primary` (+ container
  pair). Values are shadcn v4's verbatim: pure-gray oklch, `border: white/10%` and
  `input: white-alpha` in dark.
- **Cards are surface + hairline** in light; in dark the hairline is white-alpha and fills go
  translucent — depth from layered transparency (the Apple read), never tone-on-tone.
- **Intent trios recast**: `-container` is a _soft tint_ (9–14%), `on--container` is the strong
  color itself — judged content reads as **colored text on a quiet tint** (badges, delta chips,
  callout titles). Full-strength intent fills are reserved for nothing yet; earn them.
- **Color budget**: the indigo seed appears only on primary actions, links, focus, and the
  wordmark. Intents appear only where the agent made a claim. Everything else is gray — content
  is the color.
- Light and dark ship together, keyed off the renderer's `.a2ui-dark` class, all at `:where()`
  zero specificity so any host stylesheet wins. Docs site aside: a HOST may re-point `--a2ui-*`
  base tokens at auri roles (ours does); catalog packages never do.
- Contrast: WCAG 2.2 AA minimum in both themes for every text pairing. `forced-colors` maps
  intents to system colors; `prefers-contrast: more` thickens hairlines rather than shifting hue.

## 2b. Shape

shadcn-v4-derived: `--auri-shape-sm` 6px (chips, badges) · `--auri-shape-md` 10px (buttons,
inputs, callouts) · `--auri-shape-lg` 14px (cards) · `--auri-shape-pill` (progress tracks only).
Crisp, compact, consistent.

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
