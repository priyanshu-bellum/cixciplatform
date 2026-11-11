# Regional page: requirements review and verification

## Scope and user instruction

Complete one task at a time. This task corrects the Region page layout. The user
approved its push after review; Vendor API integration is next, with commission
changes queued after it. Each subsequent push requires a separate instruction.

## Requirement versus UI choice

Source: `bugs/CIXCI Buyer-to-Vendor Regional Visibility.docx`, particularly
sections 3–5, 14 and 16. The user clarified that Buyer/Entity onboarding country
resolves its country identity without separate per-Buyer region assignments.

| Requirement | Placement after correction |
| --- | --- |
| Vendor supported operating regions | Existing Company Regions table and Update Regions action |
| Explicit regional shipping-fee configuration | Existing Shipping Fees tab |
| Distribution centers do not grant coverage | Existing Distribution Centers / review workflow |
| Audit and regional recalculation evidence | Existing Region Events workflow |
| Governed canonical country identities | Admin Country Setup & Diagnostics dialog, Operating Countries tab |
| Review Buyer/Entity country resolution | Read-only Buyer Country Checks tab in that dialog |

The document did not require expanding the country registry, editable names,
country-registration form and every Buyer Entity above the Vendor table. That
layout was an implementation choice and made normal operations harder to use.
Move those secondary controls on demand rather than remove required governance
or invent a new regional business rule.

## Implementation boundaries

- Keep existing page tabs, Vendor actions, fee/DC management and permissions.
- Keep the main Vendor table directly visible. Country/Buyer requests start only
  when the appropriate diagnostics tab is opened.
- Retain read-only Buyer resolution and country-driven onboarding. There is no
  new per-Buyer assignment step, address-state conversion or parent access grant.
- Keep country inputs within narrow dialog widths and make regional tabs usable
  on mobile. Reproduce navigation defects with a browser test before fixing them.
- Detect repeated pagination URLs instead of allowing an endless diagnostic
  fetch loop.
- Do not modify visibility enforcement, relationships, fee values, currency,
  Product records or completed exports. No migration or dependency is needed.

## Verification procedure

1. Production TypeScript/Vite build of the local frontend.
2. Real local Admin browser: main coverage table/action visibility, no expanded
   country editor/Buyer list, and no eager registry/all-Entity requests.
3. On-demand country/Buyer tabs: canonical resolution and no Buyer assignment
   controls. Country-registration writes use intercepted browser fixtures.
4. Narrow viewport: horizontal tab navigation, no page overflow and a fitting
   country dialog; record failure evidence before the responsive correction.
5. Preserve existing Product/Device/dropdown/header checks through the same UI
   regression runner. Fixture mutations never create real catalog records.
6. Run the regional API contract on isolated SQLite and PostgreSQL databases.
   Recheck local Telco's four products/images; keep the existing release hold.

Actual results and any remaining limitation are recorded after execution below.
Private screenshots/logs remain under `.local-copy/compatibility-analysis/` and
are excluded from Git. No production deployment or push is implied by this work.

## Final results — 2026-11-12

- Initial desktop/functional regression run: 34/34 browser checks passed, with
  zero uncaught UI exceptions and zero failed local HTTP requests.
- New mobile regression reproduced a real defect before the responsive fix:
  the Region Events tab occupied x=459–586 in a 390px viewport and horizontal
  wheel input could not bring it into view. Private failure evidence is in
  `region-layout-red/`. The minimal fix enables scrollable tabs and mobile
  navigation controls. The final rebuilt frontend passes 37/37 browser checks:
  Region Events is now at x=207–334 in the same 390px viewport; page width remains
  390px. Country setup also fits the mobile dialog.
- Final browser run has zero uncaught UI exceptions and zero failed local HTTP
  requests. The main page performs no country-registry/all-Entity fetch before
  diagnostics are opened. Existing Product/Device/dropdown/header checks pass.
- Regional API contract: 22/22 passed on SQLite and 22/22 on PostgreSQL, using
  isolated test databases. No backend business logic changed in this task.
- TypeScript/Vite production build passed; the verified build runs locally.
- Local Telco catalog API returns HTTP 200 with exactly CP00448, CP00449,
  CP00450 and CP00451. All four images return HTTP 200 and valid PNG data.
  Product/Device counts remain 1,034/124; strict region rollout stays unchanged.
- Git whitespace validation passed. The user authorized pushing this tested task
  after reviewing the local result; no production deployment was requested.

This result completes the regional UI task only. Commission-guide compliance
and Vendor API sync remain separate, queued tasks. The previously approved
credential-encryption dependency has not been added during this UI task.

## Files

- `frontend/src/pages/RegionalPage.tsx`: scoped, on-demand Admin dialog and tabs.
- `frontend/src/pages/regional/OperatingRegionSetup.tsx`: separate country/Buyer
  views, demand-driven queries and bounded pagination behavior.
- `scripts/verify-compatibility-ui.mjs`: main-page, network and mobile regressions.
- This report, `region-setup-admin-guide.md`, the verification checklist and the
  sequential implementation plan document the behavior and queued work.
