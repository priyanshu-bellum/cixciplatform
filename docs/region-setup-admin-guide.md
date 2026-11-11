# Country-driven Buyer regions and Vendor coverage

## Current flow — user clarification, 2026-11-12

The user clarified that the country entered during Buyer Company onboarding
must resolve the operating region automatically. A separate assignment for every
Buyer does not scale and is no longer part of the UI. Each independent Entity
uses its own country; parent visibility never grants child access.

`US` and `USA`, for example, resolve to the same canonical country identity.
Blank or unknown country values require onboarding correction; address states
such as `NY`, `PA` and `ID`, DC locations and customer addresses are never used
to infer that country. Registering a country identity does not approve Vendor
coverage, fees or a Buyer/Vendor relationship.

## How to use the page

1. Enter the country in Company onboarding. Its new default Entity receives
   that country and resolves the region automatically. When adding an independent
   Entity, enter its own country in Entity settings. There is no separate Buyer
   region dropdown to configure.
2. The regional page opens with the existing Vendor coverage table and
   Shipping Fees / Distribution Centers / Region Events tabs. Admins can open
   **Country Setup & Diagnostics** when needed. **Buyer Country Checks** shows
   read-only resolution; **Operating Countries** prepares a controlled country
   identity through **Register Country**. This does not assign any Buyer.
3. Configure the Vendor's regional fee with its explicitly approved currency,
   then use **Update Regions** to activate coverage. The active Buyer/Vendor
   relationship and normal product eligibility remain separate requirements.

The audited country migration resolves the four existing `US` Buyer entities
automatically and preserves their actual country/state data. No Vendor coverage
or relationship is fabricated. The regional enforcement release hold remains
unchanged; country resolution is not a replacement for the unresolved commercial
review recorded in [the verification checklist](compatibility-verification-checklist.md).

## Compatible Products sticky header

The shared heading style used a translucent background, allowing product rows to
show through sticky cells during scrolling. Sticky header cells now use the
theme's opaque paper background, primary text color and a foreground stacking
level. The fix applies to sticky tables in both themes while regular table
heading styling stays intact.

## Validation

The current regional layout correction is documented in
[the regional UI review](region-ui-review-and-verification.md). Country setup
and Buyer diagnostics no longer occupy the main page. No regional business rule,
source record, financial policy or schema changes accompany that UI correction.
The user approved pushing this verified regional UI correction after review.
Further feature changes are tested and pushed only on a separate instruction.

Historical Phase 1 verification:

- Frontend TypeScript/Vite Docker build passed.
- Full updated Phase 1 backend suite: 347 passed on SQLite and the same 347 on
  PostgreSQL, including country aliases, missing countries, independent entities
  and the approved speaker declaration migration.
- Browser: 21 checks pass, including dark/light/mobile opaque headers, real
  automatic Buyer resolution, no per-Buyer region controls and the single-product
  Speakers modal's three controlled Universal types. Controlled country
  registration uses intercepted browser-only fixtures; actual onboarding
  persistence/permissions are covered by isolated API tests.
- Tenant migration 0014 backfills country-derived references. No dependency was
  added. The checked-in country reference identifies its UN source.
