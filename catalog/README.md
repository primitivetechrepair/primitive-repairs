# Website catalog source

`website-catalog.v4.json` is the source-controlled catalog manifest owned by
RepairLab. The older device-specific JSON files remain available to the legacy
rollback provider, but they do not synchronize to BenchLayer automatically.

## Change rules

- Keep an existing `id` stable when changing a label.
- Use `active: false` to remove an item; never physically delete its identity.
- Keep sibling `order` values unique under the same parent.
- Do not add `imageUrl`. Website card images live under `/images` and are never
  sent to or read from BenchLayer.
- Run `npm test` before pushing.
- Category eligibility is defined in `assets/js/categoryBrands.js` and checked
  both at source validation and when the booking provider reads brands. New
  makes in known categories need an explicit eligibility entry backed by an
  actual product family. Eligibility alone does not add a repair offering.
- Keep legitimate multi-category makes and discontinued repairable devices.
  Invalid assignments are retired with `active: false`; their IDs, descendants,
  and historical repair references remain intact. The browser filter also
  protects customers while an older BenchLayer release is still published.

A push that changes this manifest runs the catalog sync workflow. The workflow
only creates or replaces a private `website_sync` draft in BenchLayer. A staff
member with `settings.write` must review and publish that draft before the
public website catalog changes.
