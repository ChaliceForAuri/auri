# Atoms, catalogs, and the context window

_Why agent-facing component libraries ship as vocabularies, not parts bins — and how you get
both anyway._

---

Every developer who looks at [auri](https://chaliceforauri.github.io/auri/) for more than five
minutes asks the same architecture question, and it's the right question:

> Why catalogs? Why not just ship all the atoms — every component, freestanding — and let people
> compose whatever they want? Doesn't bundling components into named collections just create
> ceremony and box people in? What if I want one component from `ops` and one from `forms`?

I asked it myself, mid-project, after we'd already shipped the first catalog. This article is the
answer I landed on. The short version: **the atoms exist, exactly as you'd want them — but atoms
alone can't serve the second consumer, and the second consumer is the whole point.**

## Two consumers, not one

A traditional component library has one consumer: a developer. shadcn/ui, Radix, Material — all
of them are designed for a human who browses documentation, imports what they need, composes
freely, and lets the bundler tree-shake the rest. For that consumer, "all the atoms, pick what
you want" is not just fine, it's ideal. Composition freedom _is_ the product.

An agent-facing component library has a second consumer: **a language model, mid-conversation,
emitting your components as a wire format, token by token, with no backspace key.**

That second consumer changes everything, because a model cannot browse your documentation. It can
only speak a vocabulary that has been _taught to it_ — injected into its system prompt before the
conversation starts. In A2UI (the protocol auri targets), an agent describes UI as data against a
component vocabulary the host application owns. The teaching text — we call it the prompt-pack —
is not documentation _about_ the product. It **is** the interface. If a component isn't in the
pack, the agent doesn't know it exists. If the pack teaches it badly, the agent emits it wrong.

Once you see the second consumer clearly, three hard constraints appear that no amount of
composition freedom can wish away.

## Constraint one: context is a budget

Every component in the prompt-pack costs context tokens — on every request, in every
conversation, forever. A human pays the cost of a big component library once, at build time, and
the bundler throws away what they didn't use. An agent pays it at _inference time_, continuously.

"Ship all the atoms and let people pick" at the agent layer means one of two things: a monolithic
prompt-pack teaching everything (which nobody can afford to inject, and which gets worse with
every component you add), or every team hand-assembling their own teaching text for their own
subset. The second option sounds like freedom. It's actually where reliability goes to die —
which brings us to the next constraint.

## Constraint two: choice dilutes emission reliability

We test every component against a rule we set before writing any code: **no component ships until
language models emit its wire format cleanly, cold** — paste the prompt-pack into a fresh session
of at least two model families, ask for a realistic scenario, validate the output against the
JSON Schema. We call it the emission gate, and it runs as CI.

The gate taught us something that changed how we think about vocabulary size: models emit small,
coherent vocabularies dramatically better than large, loose ones. Coherence does real work here.
Our twelve components share one intent scale (`good / bad / warning / info / neutral`), one action
idiom (`somethingAction`, never `onSomething`), one rule for values (raw numbers and ISO
timestamps on the wire; the component formats them in the user's locale). A model that learns the
idiom from one component applies it correctly to the others — we've watched a model use a rule it
learned from the chart component to correctly shape props on the table component, cold. That
transfer only happens when the vocabulary is designed _as a set_.

The gate also caught failures that live at the vocabulary level, not the component level. One
model family systematically dropped the final closing brace of the wire envelope — every
component, any scenario. No per-component fix exists for that; the fix was one sentence in the
shared rules of the pack, and the failure rate went to zero across the whole vocabulary at once.
A parts-bin architecture has nowhere to put that sentence.

## Constraint three: trust is a set property

The claim that makes an agent-facing library adoptable is not "these components are well built."
It's: **"these N components, taught by this exact prompt-pack, emit cleanly across model
families — and here are the eval scores."** That claim attaches to the _collection_: this pack,
this schema, these components, evaluated together.

Hand-roll your own subset from a parts bin and you've silently discarded the evidence. Your
custom pack has never been through the gate. Maybe it works. The point of the eval discipline is
that "maybe" isn't the offer.

## So what is a catalog, actually?

Given those constraints, here's the resolution — and it's more boring than the debate suggests.
**A catalog is three thin artifacts wrapped around freestanding atoms:**

1. **A contract** — a JSON Schema scoping exactly this set of components: names, props, enums,
   actions. Renderer-agnostic; also the validator for CI, for evals, and for runtime checking.
2. **A prompt-pack** — the teaching text for exactly this set, with few-shot examples and the
   shared rules, evaluated as a whole against multiple model families.
3. **A registration** — one small object that hands the set to the renderer.

That's the entire "ceremony." Underneath, every component is an honest atom: independently
importable (`import { Stat } from '@aurilabs/ops'`), tree-shakeable, zero cross-component
dependencies, all drawing from one shared token layer. And one rule keeps the future clean:
**atoms live once.** If a second catalog needs a component the first one has, it references the
same atom. Catalogs curate; they never fork.

So "build all the atoms first, then create collections of them" — the instinct behind the
original question — turns out to be a description of the architecture, not an alternative to it.
The catalog is what an atom collection has to become the moment its consumer is a model:
scoped, taught, evaluated, versioned.

## "But can I mix them?" Yes — that's the protocol, not a workaround

The fear behind the question is lock-in: pick catalog A and lose access to catalog B. In A2UI,
mixing is the sanctioned mechanism, designed into the spec:

```ts
const catalog = createCatalogRegistry([basicCatalog, opsCatalog /*, formsCatalog */]);
```

Every registered vocabulary coexists on one surface. Each streamed component can carry its own
catalog reference; the registry resolves it. This isn't theoretical — auri's own landing page
runs this way in every frame: the layout primitives (rows, columns) come from the protocol's
basic catalog while the stats, charts, and approval cards come from `ops`, interleaved in the
same stream. A future `forms` catalog joins the registry call and nothing else changes.

One component from `ops` and one from `forms`? That works on day one of `forms` existing. The
only real cost of mixing is the honest one: your agent's prompt now teaches both vocabularies,
and you pay that context. Which is exactly why catalogs stay small and curated instead of
sprawling.

## Versioned ids: vocabularies you can cache

One more thing the catalog wrapper buys that a parts bin can't: **stability you can point at.**
Every auri catalog lives at a versioned URL that really resolves — the id _is_ the document:

```
https://chaliceforauri.github.io/auri/catalogs/ops/v1.json
```

Breaking changes are a new id, never a mutation. Agents and platforms can cache a vocabulary,
negotiate capabilities against it, and trust that it means the same thing next month. A pile of
atoms has no identity to version; a catalog does.

## The end state: compose your own — with the evidence attached

Here's where both instincts get everything they want. The roadmap feature that completes the
picture is a **catalog composer**: pick five components from `ops`, three from `forms`, and the
tool generates your merged contract, your merged prompt-pack, and — this is the part that
matters — **runs the emission eval against _your_ composition**, then mints your own catalog id.

shadcn's insight was letting developers own the components. The composer is that insight
completed for the agent era: you own the _vocabulary_, and the eval harness keeps your custom
composition as trustworthy as the curated ones. Curation remains the front door — nobody wanted
to assemble Radix from primitives by hand, which was shadcn's founding observation — and
composition becomes the power path, with receipts.

## What to do today

- **Adopting an agent-UI stack:** use a curated catalog. You inherit the teaching text and the
  eval evidence for free — that's most of the value.
- **Need components across catalogs:** register both. Mixing is native; budget the prompt tokens.
- **Need your own vocabulary:** you can mint your own catalog id today — the protocol allows any
  id — but you take on the teaching and evaluating yourself until the composer exists. The gate
  methodology is public; steal it.
- **Building your own agent-facing library:** whatever you do, don't ship atoms without teaching
  text. An atom a model was never taught is an atom that effectively doesn't exist — or worse,
  one it half-remembers and emits wrong.

## The one-sentence version

Atoms are the inventory; catalogs are the curated, taught, _evaluated_ collections that make the
inventory speakable by models — and because the unit an agent consumes is a vocabulary, **the
unit of trust has to be the vocabulary too.**

---

_auri is live at [chaliceforauri.github.io/auri](https://chaliceforauri.github.io/auri/) — the
front page is an agent building an incident console from the `ops` catalog, wire shown alongside.
Contracts, prompt-packs, and the emission-eval harness are in the
[repo](https://github.com/ChaliceForAuri/auri)._
