# Frozen catalog documents

Every file here is a catalog document that was **published under a catalog id**, kept byte-exact
so that id keeps resolving forever. A catalog id is a promise: an agent or renderer that pinned
`.../ops/v1.json` must get the same vocabulary it was written against, for as long as the site is
up. Breaking changes mint a **new id** — they never mutate an old document.

These are copied to `static/catalogs/<catalog>/<version>.json` by `apps/docs/scripts/sync-contract.js`
alongside the current contract. **Never edit a file in this directory.** If one needs a change, the
promise is already broken and the answer is a new id instead.

`v1.json` here is the 0.6.0 document, frozen when 0.7.0 changed the wire to conform to the A2UI v1.0
catalog schema rules (see `docs/migrations/0.7-generality-and-v1.md`).
