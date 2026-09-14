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

A push that changes this manifest runs the catalog sync workflow. The workflow
only creates or replaces a private `website_sync` draft in BenchLayer. A staff
member with `settings.write` must review and publish that draft before the
public website catalog changes.
