# Frozen catalog documents

Every file here was **published under a catalog id** and is kept byte-exact so that id keeps
resolving forever. A catalog id is a promise: anything that pinned it must get the vocabulary it was
written against. Breaking changes mint a new id; they never mutate an old document.

`apps/docs/scripts/sync-contract.js` serves each of these at the url in its **own `catalogId`** —
not at a path derived from this directory — which is why `intel-v1.json` still resolves at
`/catalogs/intel/v1.json` even though the package that produced it is now `insight`.

`intel-v1.json` is the 0.6.0 `intel` catalog, superseded by `insight` in 0.7.0 (see
`docs/migrations/0.7-generality-and-v1.md`).
