# Phase 6C.4 secure repair submission integration

## Pre-change submission state machine

The customer form's `submit` event did not create a Lead. It validated a
honeypot and an eight-second minimum page age, built a browser payload, and
transitioned the wizard to Review. The Review submit button then enforced an
in-memory lock and a one-minute `localStorage` cooldown, mapped the browser
payload into the legacy email shape, acquired a reCAPTCHA token, and sent it to
the same-origin `/api/submit-repair` function. That function verified reCAPTCHA
and sent an internal email through Resend. A successful email response caused
the browser to reset the form and render Confirmation with a browser-generated
`PTR-MMDDYYYY-NNNN` request number.

The old flow disabled the button while its one fetch was active, but it had no
durable request identity, no transactional receipt, no retry classification,
and no state that survived a refresh. A lost response enabled a new call with a
new browser-generated request number. The only persisted submit state was the
timestamp cooldown. Catalog responses were separately cached in
`sessionStorage`; repair selections and customer fields were not persisted.
Back navigation from Review returned to the populated form. A submission error
returned to Review with a generic retry message. Success reset the form and
rendered a Start New Request action. Google Analytics is loaded only through
the independent cookie-consent module; the submission code did not emit a
submission analytics event.

The payload contained customer name, phone, email, location, apartment, ZIP,
device labels, the catalog model identifier, repairs and repair details,
add-ons, promotion details, appointment mode/date/time/flags, notes, and local
file metadata. The legacy mapper also added Lead status, financial defaults,
payment defaults, source, timestamps, and inventory placeholders for the email
template. Those legacy-only properties are not accepted by Public Intake V1.

Meet-Up, Pickup, and Onsite required a service location and ZIP. Mail-in made
both optional. Appointment selection maintained the four website modes and
derived pickup, onsite, mail-in, and after-hours flags. File inputs were shown,
but `/api/submit-repair` sent only file metadata in the email-shaped payload;
it did not upload file bytes.

## Phase 6C.4 state machine

`draft -> ready -> submitting -> succeeded`

Safe retry branches are:

- `submitting -> ambiguous -> ready -> submitting` after a timeout, network
  failure, malformed success, or 5xx response;
- `submitting -> retryable -> ready -> submitting` after rate limiting or a
  temporarily unavailable connection;
- `submitting -> rejected -> ready` after a correctable validation or size
  rejection;
- `submitting -> conflict`, which is terminal until the customer starts a new
  request or restores the original details.

The browser stores only version, random submission ID, random idempotency key,
SHA-256 payload fingerprint, state, timestamps, and safe confirmation reference
in `sessionStorage`. It never stores the connection credential or customer
payload. A state found as `submitting` after reload becomes `ambiguous`, so the
same key is reused. A changed payload after an ambiguous or retryable attempt is
blocked for review. Starting a new request clears the state and creates a new
key.

The BenchLayer provider maps the Repair Flow through the pure Public Intake V1
adapter and sends an authenticated cross-origin POST directly to
`/api/public/intake`. Tenant, location, status, assignment, financial,
inventory, source, audit, and Supabase fields are absent. The server-owned
connection and atomic RPC remain the only tenant-routing and Lead-creation
boundary. The legacy email provider remains selectable with
`INTAKE_PROVIDER=legacy` as a temporary rollback path.

Attachments remain visible but are disabled with a clear deferred message only
when the BenchLayer provider is active. No file metadata or bytes enter Public
Intake V1.
