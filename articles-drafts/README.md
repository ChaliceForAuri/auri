# Article drafts

Long-form pieces written for auri, parked here for a voice pass before they go
into Hugo's writing pipeline. **These are drafts in Claude's voice, not Hugo's**
— the intent is that they get rewritten, not published as-is.

| Draft                                                                               | What it argues                                                                                                                                                             | Status              |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| [Designing a UI vocabulary for LLMs](designing-a-ui-vocabulary-for-llms.md)         | The **process** story: letting models review a component API before any component existed, and the five design bugs they found that the principles said couldn't be there. | Awaiting voice pass |
| [Atoms, catalogs, and the context window](atoms-catalogs-and-the-context-window.md) | The **architecture** argument: why agent-facing libraries ship as vocabularies rather than parts bins, and how you get both anyway.                                        | Awaiting voice pass |

The two are deliberately complementary and can be published in either order or
as a pair — one is the process, the other the architecture. Both lean on real
evidence from the build (the envelope-brace fix, idiom transfer between model
families, the console mixing catalogs live) rather than hypotheticals; a voice
pass should keep those concrete anchors even as the prose changes.

Facts worth re-checking before publication, because the project moved after
these were written: catalog and component counts, npm versions, and any claim
about what competitors do or don't ship — see the `auri-competitive-landscape`
notes, since two claims that were true when drafted have since been disproven
(prompt-pack uniqueness and emission-eval novelty are both **false**; the
intent-scale wedge is real and verified).
