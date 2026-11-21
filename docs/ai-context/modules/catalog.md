# Product catalog, compatibility and exports

Purpose: supplier Product truth, governed compatibility evidence, current buyer
discovery/projections and historical export/supplier-selection evidence. Features
CAT-001, CMP-001/002, EXP-001/002.

Vendor Audit (CAT-002, TASK-015): six admin-only actions under products provide
bounded source/system comparison, stats, single/bulk model mapping and explicit
review resolution. [vendor_audit](../../../backend/apps/catalog/vendor_audit.py)
owns request serializers, SQL status annotation/filtering and audited mutations;
api.py delegates to it and builds existing bulk serializer context. Source fields
derive from each connection's mappings, with legacy payload fallbacks. Raw credential
keys are redacted again at read. Counts use active, nonexcluded canonical matches;
source review totals can include unlinked observations. See [API contracts](../API_REGISTRY.md).
Review clears retain prior errors in audit and do not bypass other buyer gates.
[Tests](../../../backend/tests/test_vendor_audit_api.py) cover admin-only access,
cross-vendor reads, pagination/status, UUID/size bounds, exclusions and audit history.
Phase 3 adds vendor_values (mapped canonical names/units) for the comparison UI;
raw provider payload remains separately available/redacted. The No Image badge
checks primary reference presence; storage/network availability is a separate check.
2026-11-22 user clarification: audit writes use ordinary command validation, not
vendor-import bypass. Feature Based requires explicitly configured Hybrid before
manual models; invalid type/lifecycle requests roll back. Future Pending selections
and protected exclusions/locks are returned separately. Category/Universal edits
use existing full-product validation through the side-panel form (BR-CAT-003).

## Entry points and files

[api](../../../backend/apps/catalog/api.py), [models](../../../backend/apps/catalog/models.py),
[services](../../../backend/apps/catalog/services.py), [tasks](../../../backend/apps/catalog/tasks.py),
[source visibility](../../../backend/apps/catalog/source_visibility.py).
Compatibility: [contract](../../../backend/apps/catalog/compatibility_contract.py),
[values](../../../backend/apps/catalog/compatibility_values.py), [engine](../../../backend/apps/catalog/compatibility_engine.py),
[commands](../../../backend/apps/catalog/compatibility_commands.py),
[configuration](../../../backend/apps/catalog/compatibility_configuration.py),
[import](../../../backend/apps/catalog/compatibility_import.py), [rebuild](../../../backend/apps/catalog/compatibility_rebuild.py).
Selections: [offer_models](../../../backend/apps/catalog/offer_models.py),
[offer_services](../../../backend/apps/catalog/offer_services.py), [offer_api](../../../backend/apps/catalog/offer_api.py).
Frontend: [catalog directory](../../../frontend/src/pages/catalog/) and shared
CompatibilityFields/ValuesManager/useCompatibilityOptions.

## Workflow, API and entities

Manual/CSV/API ingestion validates source product/category/dates/prices and the same
canonical compatibility contract. Commands maintain assertions/exclusions/universal
type scopes. Device changes/configuration changes refresh buyer projections;
reads lazily repair missing/stale ones and reapply current source/media/region gates.
Export job freezes selections → task writes output/history → versioned mapping
freezes supplier/pricing/listing identity for later order resolution.

[Catalog API](../reference/api/catalog.md), [mapping API](../reference/api/integration.md).
Important actions include product CRUD/bulk import, dropdown governance, projections,
export-jobs/create_job/list_jobs/download and buyer-export-mappings/bind_listing.
[Full schema](../reference/schema/catalog.md): Product, Brand/vendor relationships,
dropdown/category config, assertions/universal scopes/projections, export jobs/
selection snapshots/export dates and BuyerExportMapping.

Dependencies: devices and tenant portfolios, pricing snapshots, region eligibility,
media readiness, vendor source integration and audit. Registry dependencies are
cyclic because shared source/projection/export features affect one another.

## Rules, security, tests and precautions

BR-SRC-001, BR-CMP-001, BR-CAT-001, BR-MED-001, BR-EXP-001, BR-REG-001. Keep
current eligibility separate from immutable completed export/order facts. Do not
route by global SKU, infer universal evidence, rewrite source data through a buyer
projection, expose vendor wholesale, or change rules without approval. MAP/config
bulk writes and post_migrate rebuilding have broad consequences.

Tests: [catalog](../../../backend/tests/test_catalog.py),
[compatibility contract](../../../backend/tests/test_compatibility_contract.py),
[failure paths](../../../backend/tests/test_compatibility_failure_paths.py),
[feature matrix](../../../backend/tests/test_compatibility_feature_matrix.py),
[supplier mapping](../../../backend/tests/test_supplier_export_mapping.py),
[export history](../../../backend/tests/test_buyer_export_history.py),
[backend verification](../../../scripts/verify-compatibility-backend.ps1).
Known issues: ISSUE-007 logging-only notification intent; ISSUE-012 coupling/performance
debt. Check all entry forms/import paths when modifying a compatibility field.
