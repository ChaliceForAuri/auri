# auri

**Beautiful, agent-facing component catalogs for [A2UI](https://a2ui.org).**

A2UI renderers give agents a spartan 18-component baseline vocabulary. auri gives them the rest: ready-made catalogs — starting with `@aurilabs/ops` for agent dashboards, data display, and human-in-the-loop decisions — each shipped as three artifacts:

- **the contract** — a spec-style schema of what an agent may say,
- **the prompt-pack** — the system-prompt text and examples that teach it to say it,
- **the implementation** — Svelte 5 components for [svelte-a2ui](https://github.com/ChaliceForAuri/a2ui-svelte).

> **Status: pre-release, contract-design phase.** Nothing here is installable yet. The design rule of the house: no component is implemented until language models can emit its wire format cleanly, cold. See [docs/PLAN.md](docs/PLAN.md).

Built by **Hugo Pretorius** ([ChaliceForAuri](https://github.com/ChaliceForAuri)), maintainer of the svelte-a2ui renderer.

Apache-2.0
