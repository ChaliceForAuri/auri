# Designing a UI vocabulary for LLMs

_I let language models review my component library's API before a single component existed. They found five design bugs my principles said couldn't be there. Notes from building [auri](https://chaliceforauri.github.io/auri/)._

---

I maintain [svelte-a2ui](https://github.com/ChaliceForAuri/a2ui-svelte), the Svelte renderer for [A2UI](https://a2ui.org) — the protocol where an agent describes an interface as _data_ against a component catalog the host application owns. No generated code, no iframes, no HTML from the model. The renderer was deliberately the boring part: track the spec, stay out of the way.

The interesting design problem lives one layer up. A catalog is a _vocabulary_ — the set of component names, props, and enums an agent is allowed to speak. And the users of that vocabulary aren't developers reading docs at their leisure. They're language models emitting JSONL, token by token, mid-stream, with no backspace key.

That changes what "good API design" means. So when I started [auri](https://chaliceforauri.github.io/auri/) — ready-made catalogs for A2UI, beginning with an ops catalog: stats, charts, tables, approval flows — I set one rule before anything else:

> **No component gets implemented until language models can emit its wire format cleanly, cold. If a model fumbles a prop shape, the contract is wrong — never fix it with prompt engineering.**

The reasoning: an awkward prop is a tax paid at inference time, by every agent, in every deployment, forever. A prompt workaround fixes one deployment. A contract fix fixes all of them. So the contract absorbs the blame, always.

## The emission gate

The method is almost embarrassingly cheap:

1. Draft the contract (a JSON Schema of components, props, enums) and a **prompt-pack** — the system-prompt snippet that teaches the vocabulary, with a few known-good example streams.
2. Paste the pack into a _fresh_ session of at least two model families. No context, no warmup.
3. Ask for the JSONL for a realistic scenario ("show the on-call engineer an incident view…").
4. Validate the output with the same schema validator your CI uses.
5. Every failure is a design review comment. Iterate the contract, not the prompt.

Later the gate stopped being a ritual and became a script: a harness that sends the pack cold to a model matrix and scores every emission against the contract. The gate is now permanent CI, and it uses the _same validator_ as the fixture tests — so the contract, the docs, and the evals physically cannot drift apart.

I went in with principles I was fairly confident about: flat props, because a model streaming JSONL should never juggle deep balanced structures. Small closed enums with forgiving defaults. Semantic, never visual — `intent: good | bad | warning | info | neutral`, never colors. Raw values on the wire — `12400`, never `"$12.4K"` — with the component formatting via `Intl` in the user's locale. And accessibility as _required_ schema props, because agent-composed pages can't be audited before they exist.

The principles held up. What I didn't expect was what the models did with them.

## What the models taught me

**1. Models discover affordances you didn't design — promote the good ones.**
My `Stat` component had `unit: "ms" | "%" | "req/s" | …` in mind, free-text. First cold run, a model emitted `unit: "USD"` for a revenue tile — a currency code, expecting locale-aware formatting on the other end. That's _better_ than what I designed. The contract now explicitly blesses ISO 4217 codes in `unit`, and the component formats them as currency. When a model invents a sensible usage, that's not an error to correct; it's a feature request from your most important user.

**2. A model can follow your rules more consistently than your contract does.**
My rules said "raw values on the wire — ISO timestamps, never pre-formatted strings." Then a model emitted ISO timestamps as chart x-axis labels… which my contract rendered as-given, raw ISO strings on screen. The model was right; the contract had a gap. (`xFormat: "datetime"` exists now.) It happened again with `Progress`: my principles said "everything displayable accepts data bindings," and a model bound the progress _denominator_ to data — `"max": {"path": "/totalPods"}` — for a rollout where the pod count could change. My schema said `max` must be a plain number. The schema was violating my own design language, and the model caught it. Twice, across two different model families, the "error" was the contract being less principled than its users.

**3. Some failure modes are format-level, and you fix them with a sentence, not a schema.**
One model family kept producing lines like `…"value":[4.2,3.1]}]}` — closing every visible structure but dropping the _envelope's_ final brace. (Each A2UI line is `{"version":…,"updateComponents":{…}}` — two closers minimum.) No schema change can fix brace-balancing. What fixed it was naming the trap in the prompt-pack: one sentence — "every line ends with two closing braces minimum; a dropped final `}` is the most common emission mistake" — took that family from failing half its hard scenarios to a clean sweep. Traps like this transfer across model families. Write them down where every agent will read them.

**4. The loop runs backward, too: implementation findings feed the contract.**
My approval component had `onApprove` / `onReject` action props. The first browser test failed mysteriously — because the renderer (correctly!) strips every `on*`-prefixed prop as defense against smuggled event handlers. Those props could never have reached any component, in any renderer with the same defense. The contract renamed them to `approveAction` / `rejectAction`, and the design language gained a standing rule: never name action props like DOM event handlers. The security model of your runtime is part of your vocabulary's design constraints, whether you noticed or not.

**5. If you can make the mistake, a model will.**
Writing my own demo, I sent a data update without a `path` — which, per the protocol, _replaces the entire data model_. Half the dashboard collapsed to loading skeletons mid-demo. I'm the person who wrote the contract, and I still hit it. That's not an anecdote about me being careless; it's evidence about the API's shape. The prompt-pack now warns about it in the rules section, right where every future agent will see it.

## The prompt-pack is half the product

The strangest realization: the system-prompt snippet isn't documentation _about_ the product. It **is** the product, as much as the schema is. An agent can't use a vocabulary it hasn't been taught, and the quality of the teaching text directly determines emission reliability. So the pack ships as a versioned artifact next to the contract — and the docs site renders its sections verbatim as the component reference, with each component's example stream doubling as its live demo. One artifact, two audiences: if the docs don't work as few-shot material, the docs are wrong.

## If you're designing any schema for models

None of this is UI-specific. It applies to tool definitions, structured-output schemas, DSLs — any JSON you want a model to emit reliably:

- **Put the schema in front of a model before you build what's behind it.** It's the cheapest design review available, and almost nobody does it.
- **Treat consistent model errors as design feedback**, not model failure. Especially when the model is following your stated principles better than your schema does.
- **Never patch with prompts what you can fix in the contract.** Prompt fixes are local; contract fixes are universal.
- **Ship the teaching text as a versioned artifact** next to the schema, and eval against it.
- **One validator** for tests, evals, and docs — drift becomes impossible instead of unlikely.
- **Write down the traps.** Format-level failure modes repeat across model families; a sentence in the right place is worth more than a retry loop.

---

_auri is live at [chaliceforauri.github.io/auri](https://chaliceforauri.github.io/auri/) — the front page is an agent building an incident console, with the wire shown beside it. The contracts, prompt-packs, emission harness, and the full gate log (every finding above, with dates and diffs) are in the [repo](https://github.com/ChaliceForAuri/auri)._
