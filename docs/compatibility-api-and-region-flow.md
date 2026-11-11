# Compatibility and regional flow

Source authority: all six compatibility/region Word requirements in `bugs/`.
The traceability and decisions are recorded in
[the analysis plan](compatibility-remediation-analysis-plan.md).

## Ownership and entry points

| Caller / input | Owner resolution | Canonical path |
| --- | --- | --- |
| Vendor dashboard Product form | Authenticated Vendor company; payload cannot change owner | Product detail serializer → shared scope/value validators → atomic Product save and explicit selection command |
| Vendor dashboard CSV | Authenticated Vendor company; no supplier dropdown | `POST /api/v1/catalog/products/bulk_upload/` → shared CSV adapter → same validators and reconciliation |
| CIXCI Admin Product / CSV | Explicit existing Vendor selected | Same paths and rules; Admin authority is checked centrally |
| Vendor company API key | Company-owned key; authorized entity context resolves on server | `POST /api/v1/catalog/products/`, `PATCH /api/v1/catalog/products/{id}/`, and CSV endpoint |
| Buyer dashboard | Authorized current Buyer Entity and its combined portfolio | Product list/detail/IDs/compatibility + current projection |
| Buyer company API key | Same company key across users; `X-CIXCI-Entity` selects an active authorized entity | Same Buyer rules, plus current company/entity export ledger eligibility |
| Buyer export worker | Revalidates job's stored company/entity/user and current portfolio | Rebuild current projection, intersect current effective mappings/media, freeze canonical model names and prices in export |

The small reference endpoints under `/api/v1/catalog/dropdown-configs/` expose
approved shared values, canonical Device Type IDs and exclusion reasons. Their
write paths require CIXCI Admin authority and before/after audits. Device form,
Device CSV/API, Product form, Product CSV/API use the same controlled values.

Vendor + exact SKU identifies an import update. A matching SKU owned by another
Vendor does not grant access. Vendor requests cannot choose another company's
ownership through a payload, CSV parameter or URL.

The repository contains integration connection/transport configuration but no
working third-party Vendor product-pull adapter. Do not assume that configuring
a connection imports products. A future adapter must bind the connection to its
Vendor, send explicit compatibility declarations through these same services,
and receive a provider-specific contract test before activation.

## Company keys and entity selection

Keys remain company-owned; no key-to-user or key-to-single-entity binding was
introduced. Send `X-API-Key` (or the existing `Authorization: Api-Key` form) and
`X-CIXCI-Entity: <authorized active entity UUID>`. The sole eligible entity may
be inferred; multiple eligible entities require explicit selection. Inactive,
foreign or ambiguous contexts fail authentication. Authentication never rewrites
a User's saved entity. API key creation/update/revocation is audited atomically;
tokens are not written into audit payloads.

## Mapping and entry rules

| Category method | Product declaration | Effective result |
| --- | --- | --- |
| Device Specific | `direct_device` + canonical model IDs | Explicit selected eligible models only |
| Universal | `universal_device_type` + at least one canonical Type ID | Eligible models within exactly those declared types |
| Feature Based | Existing direct storage mode + explicit capabilities | Configured positive comparisons |
| Hybrid | Direct storage mode + explicit models / capabilities | Union of explicit and feature evidence, deduplicated by canonical model ID |

Category and Product methods must agree. A direct model selection cannot carry a
Universal type declaration. New types never expand existing Universal scopes.
Required/Optional/Hidden/Defaulted/Conditional govern entry; matching roles and
operations are separate. `Not Compatible` and Bluetooth `No` are valid declared
answers but never positive evidence. Speaker charging data is informational
unless an Admin explicitly configures a matching rule.

Add preserves prior sources. Replace on live or previously exported/sold Vendor
products needs CIXCI Admin review. Remove records a reasoned exclusion rather
than deleting evidence. `Other` requires notes. Exclusions override the union;
Vendor changes cannot override Admin exclusions or locks. A subsequent remap
does not silently restore an excluded mapping.

Forward and reverse reconciliation share the same engine and product lock.
Reverse device changes restrict reconciliation to that device. Sets/maps avoid
duplicate evidence, current candidates are scoped to approved types, list and
CSV result counts are batched, and Vendor/SKU lookups have a compound index.

## Regional setup and release hold

The document rule is: the active Buyer Entity Operating Region matches
active Vendor coverage **AND** approved Buyer/Vendor relationship **AND** all
normal catalog/product eligibility rules. Regional fee setup must be complete;
no missing fee silently becomes zero. Ambiguous overlapping effective fees are
configuration exceptions. Product-type/region restrictions on a relationship
remain effective. Customer/DC addresses never grant commercial visibility.

Country source clarification (2026-11-12): the user confirmed that the country
captured during Company onboarding is the source for the new default entity's
region. Each independently configured Entity uses its own country. ISO alpha2
and alpha3 identities normalize through the checked-in [UN reference](https://unstats.un.org/unsd/methodology/m49/overview/).
There is no per-Buyer region assignment step. Blank/unknown country values need
onboarding correction; state, DC and delivery addresses do not supply a country.
Country identity registration does not grant Vendor coverage or a relationship.

Governed setup APIs:

- `GET/POST /api/v1/tenant/operating-regions/`; Admin creates codes and display names.
- `PATCH /api/v1/tenant/operating-regions/{id}/`; immutable code, rename/retire/reactivate display configuration.
- `PATCH /api/v1/tenant/entities/{id}/` with `country_code`; the region resolves automatically. `operating_region` is read-only and cannot override the country.
- `GET /api/v1/tenant/operating-regions/countries/`; controlled country identities for onboarding/Vendor setup.
- `GET /api/v1/tenant/operating-regions/context/`; current authorized entity's readiness/reason.
- `GET /api/v1/tenant/operating-regions/vendors/`; only region/relationship/fee-eligible Vendor names and applicable configured fees for the current Buyer Entity.
- Existing Vendor coverage activation checks a canonical region and effective fee.
- Existing shipping-fee API enforces own-Vendor scope, explicit currency, effective periods and overlapping-fee validation.

The Regional Visibility UI provides the governed catalog, read-only Buyer
country-resolution status, controlled Vendor region choices and controlled fee region
choices. Buyer catalog displays Configuration Required when the strict policy
is enabled and its setup is incomplete. Admin and Vendor source catalog reads
retain their authorized scope.
Buyer historical fee reads are restricted through the same company/entity's
orders; another store's order snapshots do not become visible through a shared
company key. Current configured fees and historical captured amounts remain
separate in the Buyer UI.

**Release hold:** `REGIONAL_VISIBILITY_ENFORCE` defaults to false. This preserves
the existing catalog regional behavior globally, including Telco's four exported
products, while actual canonical setup is reviewed. This is a deployment hold,
not a documented eligibility exemption. No Telco-specific code, guessed US/NY
mapping, automatic relationship approval or seeded commercial region was added.
Strict policy tests explicitly enable the flag. Enabling it with current copied
configuration would hold Telco's Buyer catalog; do not do so silently.

## Commercial gaps requiring review before strict regional rollout

The region document explicitly leaves cross-border currency and shipping charge
granularity open. No new conversion or per-order/suborder/shipment choice is made.
Existing fee calculation supports flat/per-unit/percentage, but that legacy
choice does not constitute approval of a new commercial policy.

Code inspection also found that the existing shipping snapshot helper is not
connected to a complete order-to-invoice flow, legacy routing checks still use
company address region, and PO finalization chooses the first company entity.
These commerce paths are **not certified by the compatibility tests**. They need
a separate governed implementation/review together with the document's open
financial decisions before strict regional rollout can be declared complete.
Historical orders, invoices, completed exports and transaction snapshots have
not been rewritten by this compatibility repair.
