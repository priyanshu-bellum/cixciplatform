# Compatibility remediation: analysis and implementation plan

Status: compatibility implementation and local reconciliation complete; backend
verification passed on both databases. Strict regional enforcement remains a separate release
hold until actual canonical business configuration is reviewed.

## Scope and authority

Latest source clarification, 2026-11-12, supersedes the earlier per-Entity manual
region setup decision below: derive the default Buyer's region from its country
captured at Company onboarding, and each independently configured Entity from
its own country. Do not require a separate region assignment for every Buyer.
Country identity registration does not grant Vendor coverage, relationship or
fee eligibility. See [the revised guide](region-setup-admin-guide.md).

The user also explicitly confirmed that Speakers should use Universal and that
BAS-214-MO declares Phone + Tablet + Smartwatch. This is applied as an audited
one-time declaration/configuration migration; the shared engine contains no SKU
exception. Other Speakers without declarations require review. No Bluetooth
capability is inferred from a product name.

The primary sources are the documents in `bugs/`, as requested by the user:

| Reference | Document | Relevant requirements |
| --- | --- | --- |
| CATEGORY | CIXCI_Category_Compatibility_Configuration_Requirement.docx | Sections 1-9: governed category configuration, Device Specific/Universal/Hybrid, matching comparisons, shared validation, recalculation, buyer scope |
| VALUES | CIXCI_Device_Compatibility_Value_Management_Requirement.docx | Sections 1-5: six shared managed fields, linked storage capacities, wireless combination rules, permissions and audit |
| FLOW | CIXCI_Device_to_Accessory_Functional_Mapping_Flow.docx | Sections 1-12: canonical identities, method selection, exclusions, buyer portfolio intersections, triggers and history |
| UNIVERSAL | CIXCI_Universal_Device_Type_Compatibility_Developer_Requirement_v1.0.docx | Sections 3-20: canonical type IDs, input parity, reverse mapping, retirement, exclusions, export projection and immutability |
| AUTO | Device-to-Accessory Compatibility Auto-Mapping Requirement.docx | Forward/reverse feature matching, explicit declarations, Add/Replace controls, durable reasoned Remove, device eligibility, export names and audit |
| REGION | CIXCI Buyer-to-Vendor Regional Visibility.docx | Visibility is entity-scoped and region/relationship/catalog gates remain independent; financial placeholders must not be invented |

The newer category requirement explicitly supersedes older category decisions.
Current eligible matching types are Phone, Tablet and Smartwatch. Smartphone
is an approved alias for Phone. Older Universal examples mentioning Laptop do
not authorize adding Laptop to current matching eligibility or deleting its
historical references.

The supplied Claude transcript is a report of attempted work, not evidence that
all changes are correct or complete. The user's current instruction authorizes
local implementation after analysis; the quoted client request for a discussion
does not authorize a production deployment or live data repair.

The subsequently supplied client transcript is primary symptom evidence:
00:19 reports both scroll directions; 00:32-01:04 reports CF-105-LP incorrectly
on iPhone Duo and other new devices; 01:04-01:27 reports missing expected speaker
matches; 01:48-02:24 reports confusing Product Catalog compatibility rows and
an unfamiliar device label; 02:24-03:18 reports the false Universal banner and
Phone/Smartphone selector mismatch. At 03:32 the client requests discussion
before updates. Implementation here is therefore a locally tested reviewable
change, not a production rollout or unapproved live data cleanup.

Additional evidence reviewed:

- `bugs/iPhone 18 accessories test run v2.xlsx`: PC-301 charging-cable input,
  with Type-C supplied through the compatibility column; useful for CSV parity.
- `bugs/bug fixes.pptx`: eight slides about price labels, dates, invoices,
  tenant order visibility and a pricing screen. These are separate legacy bugs;
  no new shipping, invoice or financial policy will be introduced here.
- Current working-tree changes from Claude, saved privately before editing in
  `.local-copy/compatibility-analysis/claude-working-tree.patch`.
- Read-only inspection of the restored local database, saved privately in
  `.local-copy/compatibility-analysis/database-baseline.json`.

## What the documents require

1. Device Specific means explicit canonical model selections, not every model
   sharing a device type. Universal requires a product's explicit declared type
   scope. Hybrid is explicit OR feature matches, deduplicated by Device ID.
2. Required/optional/hidden/defaulted/conditional are data-entry rules. Matching
   participation and comparison operations are a separate configuration concern.
   Match Any/All applies inside feature matching, not to the Hybrid union.
3. Charging Interface is charging evidence; Headphone Jack is audio evidence.
   Storage needs matching expansion type AND sufficient normalized capacity.
   Blank/Not Compatible/false Bluetooth provide no positive evidence. Tablets
   cannot supply wireless evidence. Proprietary charging, NFC and ANT+ cannot
   produce matches.
4. Admin-managed shared values and combination/capacity rules must work equally
   in device/accessory forms, CSV and API, with backend authorization and audit.
5. Universal scope must be stored with canonical Device Type IDs, not mutable
   labels or codes alone. Adding a type never silently expands existing scope.
6. Reverse and forward remaps must agree, remove stale derived effectiveness,
   preserve other valid sources, and retain exclusions, locks and history.
7. Buyer results intersect effective mappings with that buyer entity's eligible
   portfolio, then apply existing region, vendor, lifecycle, media and price gates.
   Completed exports and historical transactions are never rewritten.
8. The user additionally requires the Device Details & History modal to be
   larger, with a usable Compatible Products table and history view.

## Confirmed findings and incomplete Claude changes

| Area | Evidence and gap | Required treatment |
| --- | --- | --- |
| Wrong Universal remap | Reverse mapper gained a mode filter, but the forward Universal entry point still accepts direct products with type data | Guard both paths and cover direct invocation and reverse triggers |
| Inconsistent mode/types | Model clean rejects the combination; the serializer silently discards submitted types | Use explicit shared validation with clear field errors, including PATCH and CSV parity |
| Category mode contract | Engine recognizes explicit/device_specific; Claude removed Universal from the UI rather than implementing its documented meaning | Preserve documented modes and explicitly document/support the existing feature-only route |
| Shared type identity | UI checkbox values changed from names to codes; backend JSON still stores codes | Introduce canonical ID-based scope with backward-compatible controlled input normalization |
| Shared values | Micro-USB/3.5mm were appended to hardcoded validators; admin-managed values are still absent | Centralize controlled values and validation rather than grow independent hardcoded lists |
| Wireless rules | Device UI/API still prohibit Qi plus Qi2 regardless of admin configuration | Govern combinations through shared saved configuration; always keep Not Compatible exclusive and tablet evidence disabled |
| Wired audio | Matcher accepts a device's charging port as headphone evidence | Compare audio with Headphone Jack only; keep charging separate |
| Storage | Local Memory category has only memory_capacity and OR; expansion/capacity associations are not managed | Validate explicit configured comparisons and linked capacity choices; do not silently rewrite an admin's category settings |
| Hybrid and stale mappings | A single basis string is overwritten; remappers can delete derived rows and lose valid alternate-source evidence | Reconcile one effective relationship while preserving per-source evidence, exclusions and historical rows |
| Lifecycle/reverse cleanup | Existing code often excludes only retired and may leave stale Universal matches on type/status changes | Use consistent current eligibility and reconcile both additions and removals |
| Admin configuration | Dropdown write protection currently uses an admin flag alone, with minimal backend validation and no before/after config audit | Reuse canonical check_access and existing AuditRecord mechanism; validate visual and JSON representations equally |
| Modal clipping | Device Details & History still has maxWidth=sm; increasing the inner table height does not fix the parent layout | Responsive larger dialog and correctly bounded horizontal/vertical scrolling |
| Missing rows after 50 | Device Compatible Products requests limit=1000, but ProductPagination reads page_size and defaults to 50 | Use the supported unpaginated route or explicitly load all pages; verify over 50 rows |
| Compatibility display | Client confirms confusing Product Catalog rows; no literal Not Sure string found in current code. UI resolves names from its local device cache, falls back to an eight-character UUID, calls every non-excluded row Active and displays a Universal banner for any nonempty types array | Enrich canonical device identity from the backend, derive honest mapping state and guard the banner with product mode |

## Local data state: important correction to the transcript

Read-only inspection found:

- Migration `catalog.0026_fix_compatibility_data` is ALREADY applied locally.
- CF-105-LP is direct_device with an empty universal type list.
- It retains one compatible manufacturer_assertion and is compatibility complete.
- No direct_device products with nonempty Universal type lists remain locally.
- The untracked migration deletes mappings, has a no-op reverse function, and
  does not record the cleanup in the existing audit mechanism. It must not be
  represented as an unapplied, reversible or production-safe repair.
- The original imported dump is retained; none of this inspection changes it.

No production repair/deployment is authorized by this implementation. A safe
repair path needs a dry-run report and audited retirement of only unsupported
derived matches, preserving exclusions, locks, explicit evidence and snapshots.
Do not rerun the applied cleanup or infer a universal declaration from a name.

## Decisions and limits to resolve before release

- The referenced "Compatibility Configuration Validation Rules" sections 3.2
  and 7.1 were not supplied under that title. The reviewed documents do specify
  many newer rules explicitly; any remaining undefined behavior must be listed,
  not invented.
- Existing category configuration is administrative source data. Bad/incomplete
  Memory settings must be surfaced for authorized configuration, rather than
  silently converted to a new business rule during a data migration.
- APPROVED by the user: preserve existing wireless restrictions as the legacy
  default when no combination matrix exists. An explicitly saved admin matrix
  overrides those restrictions. Not Compatible remains exclusive and Tablet
  evidence remains disabled regardless of the saved matrix.
- APPROVED by the user: Not Compatible and Bluetooth No are valid declared
  answers even for Required fields. Required controls data entry; those values
  never supply positive matching evidence.
- APPROVED by the user: reject a Device Specific category / Universal product
  mismatch; product/category methods must be consistent. Category Universal
  requires an explicit product Universal scope. The existing direct product
  storage mode also represents category Feature Based and Hybrid processing.
- APPROVED by the user: catalog/API compatibility uses the combined authorized
  current portfolio within the SAME Buyer Entity. Stored triad/creator evidence
  stays intact; derived catalog results must not include another entity/company.
  Local Telco has two admins in one entity and its portfolio/export references
  belong to one of them, so filtering the derived result to the integration's
  selected admin user would incorrectly hide the existing four products.
- The existing `devices.services.get_company_portfolio_device_ids` already
  owns the entity-shared portfolio rule. Reuse it rather than invent per-user
  aggregation or remove company-owned devices when their creator is inactive.
- Initial read-only finding: Phone, Tablet and Smartwatch had
  auto_mapping_eligible=false. The user subsequently explicitly authorized an
  audited migration enabling these three active current types. Migration 0031
  implements that decision without enabling inactive or new types.
- Regional currency and shipping-fee granularity are expressly open in REGION
  section 13 and are outside the compatibility implementation.
- Existing API contracts must remain readable while canonical IDs become the
  matching source. Display-label renames must not invalidate stored scopes.

## Planned implementation sequence

### Continuation decisions and rollout hold (2026-11-11)

All six compatibility/region Word requirements have now been reviewed, including
`Device-to-Accessory Compatibility Auto-Mapping Requirement.docx`. The region
document, not developer preference, owns regional eligibility. Its explicit
currency and shipping-charge granularity placeholders must remain open.

The user confirmed company-owned API keys with explicit authorized entity
selection, entry validation separate from positive matching, category/product
method consistency, and audited activation of the three current automatic device
types. Canonical Operating Region setup must be explicit at entity scope; no
address/state inference and no automatic parent access for children.

**Regional rollout hold:** Telco's existing four SaharaCase products must
remain correct. The copied configuration has no canonical entity Operating
Region and no active Telco–SaharaCase relationship. Strict document gates would
exclude those products. Do not fabricate approvals or a company-specific bypass.
The user subsequently confirmed that Telco must keep receiving its data. Schema
and configuration UI are applied locally; strict regional enforcement is held
OFF globally with `REGIONAL_VISIBILITY_ENFORCE=false`. No canonical region,
relationship approval or tenant-specific exception has been fabricated. The
document policy is tested separately with enforcement ON. Real configuration and
commercial-flow review remain required before enabling that policy in a rollout.

Supplier selection is only an Admin import requirement. Vendor dashboard CSV and
authenticated Vendor API writes derive ownership on the server. External Vendor
product-fetch adapters are not present in the repository; do not claim those live
integrations have been certified.

- [x] Inventory documents and preserve Claude's partial changes.
- [x] Extract and review all six Word documents in bugs; inspect sheet/PPT text.
- [x] Inspect the restored database without changing catalog data.
- [x] Finish entry-point, authorization, buyer projection and export traceability.
- [x] Run baseline Claude/existing compatibility tests in isolated test settings:
      22 passed, 3 failed. Failures include outdated API/role fixture assumptions
      and a real CSV crash when an admin has no company. The private baseline log
      retains full evidence; authorization will not be weakened to make tests pass.
- [x] Explain confirmed findings, unsafe changes and open decisions to the user.
- [x] Implement shared identity/configuration/value validation and API/UI parity.
- [x] Reconcile forward/reverse mapping, evidence, exclusions and eligibility.
- [x] Add an audited, history-preserving repair path with dry-run support.
- [x] Enlarge and verify Device Details & History and table scrolling.
- [x] Add/run document-driven regressions on isolated test databases; verify
      frontend build and UI at desktop and narrow widths with existing tooling.
- [x] Update this document with final changes, results, limitations, migration
      sequencing and recommended review before any live rollout.

## Implementation outcome

The combined targeted suite passes 336 tests on SQLite and the same 336 on
PostgreSQL. It includes the complete three-type/four-method JSON/CSV and JWT/key
matrix, negative inputs, exclusions/locks, atomic rollback, entity isolation,
exports, existing catalog/device lifecycle and tenant/pricing regressions.
Frontend build, Django checks and migration drift checks pass. The actual local
Telco key returns its exact four products; all four images return valid PNG data.
The full reconciliation repeats with zero mapping changes.

Final Chromium verification passes all 13 checks, including real entity setup
controls, Admin/Vendor supplier selector behavior, shared values configuration
and both scroll directions at desktop/mobile widths. Vendor UI uses a declared
read-only profile fixture; the real Vendor JWT/key contract is covered by the
isolated backend entry matrix.

Review the final [verification checklist](compatibility-verification-checklist.md),
[API and region flow](compatibility-api-and-region-flow.md), and
[working-tree file inventory](compatibility-files-changed.md). They identify the
strict regional release hold, existing commercial integration gaps, migration
caveats and external Vendor adapter limitation explicitly.

## Required verification matrix

- Direct case does not inherit a newly added Phone through Universal mapping.
- Universal needs at least one approved canonical type; mixed model/type input,
  inactive/unknown types and malformed PATCH input fail clearly.
- Type label rename, new type/model, retirement and scope reduction preserve
  canonical scope and retire only unsupported derived effectiveness.
- Hybrid A + feature B/C = A/B/C once; an exclusion overrides every source and
  another valid source survives removal of just one matching basis.
- Wired audio/charging separation; 3.5mm and Micro-USB shared options; numeric
  storage capacities; no blank/Not Compatible positive matches.
- Configured wireless combinations and Tablet restrictions on all entry paths.
- Admin-only controlled-value/category writes through check_access, duplicate
  normalization, linked capacity validation, and before/after audit evidence.
- Equivalent manual, CSV and API input produces equivalent effective mappings.
- Buyer entity isolation, portfolio intersection, global vs buyer zero-match,
  device launch/status eligibility, region gates and immutable prior exports.
- Both mapping views agree and the enlarged dialog remains usable with many
  products, all columns, vertical/horizontal scrolling, and long history text.
