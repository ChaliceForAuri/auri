# auri

[![CI](https://github.com/ChaliceForAuri/auri/actions/workflows/ci.yml/badge.svg)](https://github.com/ChaliceForAuri/auri/actions/workflows/ci.yml)

**Beautiful, agent-facing component catalogs for [A2UI](https://a2ui.org).**

**See it live: [chaliceforauri.github.io/auri](https://chaliceforauri.github.io/auri/)** — an agent
builds an ops console in front of you, with the wire shown beside it.

A2UI renderers give agents a spartan 18-component baseline vocabulary. auri gives them the rest:
ready-made catalogs — starting with `@aurilabs/ops` for agent dashboards, data display, and
human-in-the-loop decisions — each shipped as three artifacts:

- **the contract** — a spec-style schema of what an agent may say
  ([catalog.json](https://chaliceforauri.github.io/auri/catalogs/ops/v1.json), served at its own
  catalog id),
- **the prompt-pack** — the system-prompt text and examples that teach a model to say it
  ([prompt.md](https://chaliceforauri.github.io/auri/catalogs/ops/prompt.md) — paste it into your
  agent),
- **the implementation** — Svelte 5 components for
  [svelte-a2ui](https://github.com/ChaliceForAuri/a2ui-svelte).

The design rule of the house: **no component ships until language models emit its wire format
cleanly, cold.** Every contract passed a cross-family emission gate (Claude + GPT) before any
Svelte was written; the harness (`npm run eval` in `packages/ops`) and the
[gate log](packages/ops/contract/README.md) are in this repo.

## The ops catalog — 12 components

`Stat` · `Badge` · `Callout` · `DataTable` · `ApprovalCard` · `Chart` · `Timeline` · `Sparkline` ·
`Progress` · `KeyValue` · `CodeBlock` · `ConfirmButton`

One shared intent scale (`good · bad · warning · info · neutral`), raw values on the wire
(components format via `Intl` in the host locale), skeleton/empty/error states designed in, motion
as a system, a11y enforced by the contract itself. See the
[component pages](https://chaliceforauri.github.io/auri/components) — each replays its own
contract fixture with a scrubbable wire — and the
[visual sheet](https://chaliceforauri.github.io/auri/sheet).

> **Status: pre-release.** The site, contracts, prompt-packs, and components are done; the first
> npm release (`@aurilabs/ops`, `@aurilabs/core`) lands shortly. `svelte` and `svelte-a2ui` are
> peers.

Built by **Hugo Pretorius** ([ChaliceForAuri](https://github.com/ChaliceForAuri)), maintainer of
the svelte-a2ui renderer.

Apache-2.0
