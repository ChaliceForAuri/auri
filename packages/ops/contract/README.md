# The ops catalog contract

This directory is the catalog's source of truth, designed **before** any Svelte code exists:

- `catalog.json` — the component contract: names, properties, enums, slots, actions, in the A2UI catalog-definition style.
- `prompt.md` — the prompt-pack: the system-prompt snippet that teaches an agent this vocabulary.
- `examples/*.jsonl` — one realistic fixture per component, plus combined scenarios. These are few-shot material, documentation, and (from M2) the replay fixtures for browser tests and docs pages.

The gate for every component: paste `prompt.md` into a fresh session of at least two model families and ask for the JSONL for a realistic scenario. Iterate the **contract** until they emit it cleanly on the first try. A model fumbling a prop shape is a contract bug, not a prompting problem.
