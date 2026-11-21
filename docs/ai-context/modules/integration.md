# External integrations and vendor commerce

Purpose: company B2B credentials/storefront identity, generic connection records,
durable supplier catalog synchronization, commerce dispatch/polling and signed
webhooks/finance mirrors. Features INT-001/002/003/004 and EXP-002.

TASK-015 phase 1 (2026-11-21): [catalog_onboarding](../../../backend/apps/integration/catalog_onboarding.py)
shares audited activation/brand fallback across API/import/sync. Connection creation
activates draft/pending_setup; sync only draft after admin validation. Missing active
brands get authorized_distributor links; inactive decisions are preserved (BR-INT-002).
Brand keys follow existing whitespace/case normalization. Balaji template now uses
200 rows/page and 100,000 rows/day; validation ceilings 500/100,000 do not override
provider-enforced quotas. Existing saved configs are not rewritten automatically.
Vendor declaration parsing receives None; canonical product/mapping validation still
runs. [Phase 1 tests](../../../backend/tests/test_vendor_import_phase1.py) use Django TestCase.

## Entry points and files

[urls](../../../backend/apps/integration/urls.py), [models](../../../backend/apps/integration/models.py),
[commerce models](../../../backend/apps/integration/commerce_models.py),
[storefront models](../../../backend/apps/integration/storefront_models.py),
[authentication](../../../backend/apps/integration/authentication.py).
Catalog: catalog_api/config/sync/import/media/transport/secrets plus catalog_brands_api.
Commerce: commerce_api/config, order_dispatch, shipment_poll, webhook_receiver,
webhook_handlers, webhook_dispatch, finance_sync, operations_api and tasks.
All exact paths are in [codebase map](../CODEBASE_MAP.md); generic connection/API-key/
webhook viewsets live in [shared_api](../../../backend/apps/shared_api.py).
Frontend: IntegrationPage, VendorCatalogPage and VendorCatalogConsole/ConfigEditor.

## Workflow, API and data

API key resolves active company and authorized active entity user; it never rehomes
users. Admin saves vendor API mode, approved brand and validated config/credentials
→ transaction creates durable sync → after-commit task publication → page budget/
cursor/lease processing → durable raw source/review and canonical Product adapter
→ image processing. Commerce profiles bind connection/config versions → frozen
order facts → supplier dispatch/response/retry → incremental shipment poll or signed
webhook → scoped handoff evidence. Outbound event rows retain retries; finance/
return sync upserts provider mirror records.

[API](../reference/api/integration.md), under `/api/v1/integration/`; signed receiver
`webhooks/{receiver_id}/` is a plain Django view. [Schema](../reference/schema/integration.md)
contains 19 models across general, storefront and commerce files: catalog
connection/item/run/budget, company keys, storefronts, commerce profiles/dispatches/
polls/receipts/outbound deliveries and finance/return records.

## Rules, security, tests and precautions

BR-INT-001, BR-WHK-001, BR-EXP-001, BR-TEN-001, BR-SRC-001. Preserve MultiFernet
key-ring encryption/redaction, HTTPS-only public-target DNS pinning, body bounds,
no unsafe credentials/redirects, durable idempotency, after-commit publication,
replay handling and supplier/entity scope. Do not log credentials or decrypt
provider data into documentation. Dedicated queues require actual worker consumers.

Tests: [catalog sync](../../../backend/tests/test_vendor_catalog_sync.py),
[media](../../../backend/tests/test_vendor_catalog_media.py),
[admin commerce](../../../backend/tests/test_cixci_admin_commerce.py),
[operations](../../../backend/tests/test_vendor_operations.py),
[webhook/shipment](../../../backend/tests/test_webhook_and_shipment.py),
[outbound](../../../backend/tests/test_outbound_webhook.py),
[Balaji](../../../backend/tests/test_balaji_integration.py),
[API keys](../../../backend/tests/test_api_keys.py).
ISSUE-008 key/schema exposure, ISSUE-010 index drift, ISSUE-011 queue/default risk.
Preserve pre-existing catalog_import.py WIP; bulk brand creation bypasses dropdown
signals and needs cache/flow verification in its own task. No live provider run was
performed in memory initialization; generic CRUD is not universal connector execution.
