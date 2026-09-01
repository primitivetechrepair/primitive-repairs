# Phase 6C.3 catalog integration architecture

## Pre-change dependency graph

`index.html`
→ `assets/js/wizard.js`
→ hard-coded device and brand arrays
→ `assets/js/catalog.js`
→ `catalog/phones/phones.json` for phones
→ `catalog/{device}/{brand}.json` for other device branches
→ `assets/js/renderer.js`
→ `assets/js/cardRenderer.js`
→ local images under `images/devices`, `images/brands`, `images/series`, `images/models`, and `images/repairs`

The wizard keeps its selection in the in-memory object exported by
`assets/js/state.js`. It does not persist catalog selections in a URL, query
string, cookie, `localStorage`, or `sessionStorage`. Editing a parent selection
calls `resetStep` to clear its descendants. Appointment choices are implemented
by `assets/js/appointments.js`. The review/confirmation path maps the existing
website payload with `assets/js/leadMapper.js` and submits it through
`assets/js/leadSubmitter.js` to `/api/submit-repair` after reCAPTCHA validation.

There was no catalog ETag cache, last-known-good fallback, or generated catalog
asset. A catalog-file fetch failure surfaced as an exception rather than a
customer-safe retry state. Unrelated website features use browser storage, but
the repair catalog selection does not.

## Phase 6C.3 dependency graph

`index.html`
→ `assets/js/wizard.js`
→ `assets/js/catalogProviders.js`
→ `/api/catalog-config` (`api/catalog-config.js`)
→ `BenchLayerCatalogProvider`
→ `assets/js/catalogClient.js`
→ authenticated cross-origin `GET /api/public/catalog`
→ `assets/js/catalogAdapter.js`
→ the existing renderer, state, appointment, review, and submission modules

The website never supplies an organization or location identifier. BenchLayer
resolves both from the hash of the deliberately public connection credential.
The credential is returned to the browser only by the same-origin runtime
configuration endpoint and is sent only in the `Authorization` header to the
validated HTTPS catalog endpoint. It is never put in a URL, query string, cache
key, source file, or log by the catalog client.

The adapter validates Public Catalog schema version 1, bounds the tree size,
rejects duplicate/prototype-like nodes and unsafe labels, strips unknown fields,
and creates deterministic hierarchy-scoped public selection identifiers. It
does not project prices, tenant identifiers, connection identifiers, or other
internal fields. Repair time and warranty are projected only when the public
contract supplies them.

The client keeps schema-aware catalog responses and ETags in `sessionStorage`
for at most 24 hours. Cache keys contain an explicit deployment scope and a hash
of the endpoint, not the credential. Browser HTTP revalidation uses
`cache: no-cache`, allowing Chromium to send `If-None-Match` from its private
cache and merge a `304` with the previously CORS-approved response. Fetch
implementations that surface `304` directly reuse the validated session-cached
body. Network, authorization, schema, and malformed-response failures fail
closed and show a customer-safe retry state. There is no stale-on-error fallback.

## Images and legacy rollback

Existing local image mappings remain in use when Public Catalog V1 has no safe
public image. Public images are accepted only from the public
`intake-card-images` Storage path; private Storage paths are never projected.
Image migration and bucket-policy changes remain deferred.

`LegacyCatalogProvider` keeps the pre-6C.3 local JSON implementation available
as an explicit environment-controlled rollback. The following files are now
legacy/non-authoritative when `CATALOG_PROVIDER=benchlayer`:

- `catalog/phones/phones.json`
- all `catalog/{device}/{brand}.json` files
- the local-fetch path in `assets/js/catalog.js`
- hard-coded legacy device/brand lists retained in `assets/js/catalogProviders.js`

They are intentionally not deleted in Phase 6C.3.
