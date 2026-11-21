# API registry

TASK-015 adds six admin-only product audit actions (2026-11-21). The mechanical
catalog reference was refreshed from a fresh SQL-blocked inventory; counts in the
original initialization paragraph below describe that earlier snapshot.

| Method / product-relative route | Request, scope and result |
|---|---|
| `GET vendor-audit/` | vendor UUID required; optional brand UUID, search, audit_status (review/no_devices/no_image/ok), page/page_size. Product-list capability plus is_cixci_admin. Numbered pagination always enabled, maximum 200. Status precedence review → no_devices → no_image → ok, filtered in SQL before pagination. Extended ProductList payload includes redacted vendor_payload, review_errors, current device_assertions and config-derived payload_devices/images/category. |
| `GET vendor-audit-stats/` | vendor UUID required. total/active/with_image/no_image, mapped/unmapped direct-device products, review_products, review_required source rows (including unlinked), unlinked_review_required, vendor product brands. Mapping counts only current compatible nonexcluded assertions with existing devices. |
| `POST {pk}/map-devices/` | device_ids UUID list (max 500); update_type replace/add/remove. Product-update capability plus admin. Calls existing canonical command with normal category/type validation (vendor_import=False, user clarification 2026-11-22). Feature Based requires explicit Hybrid configuration before manual mapping. Remove requires existing exclusion_reason/notes policy. Returns effective device_count, requested_count, unapplied_device_ids, pending_device_ids and protected_device_ids. Ineligible selections roll back instead of saving ineffective evidence. |
| `POST bulk-map-devices/` | product_ids (1–50), device_ids, add/replace. Validates before work; per-product savepoints, explicit failures/results and partial status, never silent truncation. Unknown product IDs reported. |
| `POST {pk}/resolve-review/` | Admin clears linked source holds; records previous errors in append-only audit and invalidates current projections. Other media/MAP/region/lifecycle gates continue to apply. Returns cleared count. |
| `POST bulk-resolve-review/` | product_ids (1–200); validates existence before any clears; one atomic transaction, per-product evidence and cleared count. |

Base: `/api/v1/catalog/products/`. Handler/serializer:
[catalog/api.py](../../backend/apps/catalog/api.py); query/mutation helpers and
request serializers: [vendor_audit.py](../../backend/apps/catalog/vendor_audit.py).
Malformed UUIDs/limits/mapping validation return 400, nonadmins 403, scoped missing
objects 404. Frontend consumer is added in phase 3. No schema migration required.

Phase 3 consumer: [VendorAuditTab](../../frontend/src/pages/catalog/VendorAuditTab.tsx).
`vendor_values` contains canonical field names/units produced by each connection's
configured mapping, alongside unchanged/redacted `vendor_payload`. The UI uses
vendor_values for monetary/name/color/stock comparison rather than assuming Balaji
JSON keys; payload_devices/images/category remain explicit source evidence.

Category/Universal setup uses existing `GET, PATCH products/{pk}/`: fetch full
compatibility fields, submit product_category + product_category_override, declared
configured field values, compatibility_mode, compatible_device_types; direct model
selection also sends device_ids/compatibility_update_type. Existing validation,
media/lifecycle gates and audited category configuration remain authoritative.

Verified 2026-11-19 from `config/urls.py`'s active resolver: **310 owned API route
patterns**, including explicit schema/docs version aliases, excluding format-suffix
aliases, DRF router roots, HEAD/OPTIONS and Django admin internals. A route may
support several methods. Route existence does not prove the handler is correct.

## Per-handler contracts and routes

Each reference lists HTTP method/path/action, controller and handler symbols,
serializer/model source, declared authentication/permissions/throttles, capability
map, statically observed request/query keys, Response keys, local service imports,
and frontend consumers. Database fields and constraints live in the linked schema
reference. Default serializer metadata is not a complete action schema: inspect
`get_serializer_class`, inline action serializers, validators and redaction branches.

| Surface | Routes/handlers | Consumers / module |
|---|---|---|
| Auth | [auth](reference/api/auth.md) | LoginPage, authStore, apiClient |
| Company/region/user | [tenant](reference/api/tenant.md) | SettingsPage, CompanyUsersPage, RegionalPage |
| Audit/files | [audit](reference/api/audit.md) | Admin/vendor evidence views |
| Devices/portfolio | [devices](reference/api/devices.md) | DevicesPage, catalog device selection |
| Products/compatibility/export | [catalog](reference/api/catalog.md) | CatalogPage, TelcoCellularPage, B2B clients |
| Assets/images | [media](reference/api/media.md) | MediaPage, product editor, BuyerProductImagesPage |
| Notification platform | [notifications](reference/api/notifications.md) | NotificationsPage and source-module events |
| Prices/commissions/MAP/shipping | [pricing](reference/api/pricing.md) | PricingPage, RegionalPage, buyer catalog |
| Order acceptance/export | [routing](reference/api/routing.md) | OrdersPage, buyer storefront/order integrations |
| Shipping/returns/SLA | [fulfillment](reference/api/fulfillment.md) | FulfillmentPage, buyer shipping API |
| Invoices/reconciliation | [invoicing](reference/api/invoicing.md) | InvoicingPage, buyer invoice reads |
| Supplier/B2B connections | [integration](reference/api/integration.md) | IntegrationPage, VendorCatalogPage/Console |
| Reporting | [analytics](reference/api/analytics.md) | AnalyticsPage, DashboardPage |
| Purchase orders | [procurement](reference/api/procurement.md) | ProcurementPage, TelcoCellularPage |
| Launch coordination | [launch](reference/api/launch.md) | LaunchPage |
| Image proxy and API schemas/docs | [platform](reference/api/platform.md) | Public image links and integration documentation |

## Shared contracts

- API base `/api/v1/`; trailing slash matters. Default authentication order is
  session, company API key (`X-API-Key`), JWT (`Authorization: Bearer …`). Some
  views restrict JWT/admin access. A company key may require `X-CIXCI-Entity`
  when several authorized active entities exist. No secret values belong here.
- Defaults: IsAuthenticated, anonymous/user throttles; class/action overrides apply.
  Capabilities and tenant/company/entity query filtering are separate requirements.
  Never infer a role permission from a route or sidebar alone.
- Generic model CRUD typically returns 200 for reads/updates, 201 for create, 204
  for delete, with serializer validation errors at 400. Most DRF exceptions are
  wrapped as `{error: true, status_code, detail}`. Explicit Responses use handler-
  specific shapes (`error`, `errors`, `code`, etc.); do not normalize clients by assumption.
- Default cursor lists: `{next, previous, results, count}`; count is nullable unless
  `include_count=true`; page_size defaults to 50, maximum 200. `paginate=false`
  can return a list. Some specialized views use other pagination or action arrays.
- Typical errors: 400 validation/state, 401 missing/invalid credential, 403 denied
  capability/scope, 404 scoped object, 429 rate/budget limit. Conflict/review codes
  depend on the action. Plain Django views use HttpResponse/JsonResponse, not DRF wrappers.
- Stored `backend/schema.yml` and buyer/vendor documentation filters are secondary
  artifacts; current routes, serializers, services and tests define runtime behavior.
  Session-only schema file access differs from DRF force_authenticate (ISSUE-009).

## Important end-to-end contracts

| API | Request and validation | Response / database / services |
|---|---|---|
| `POST /api/v1/auth/login/` | email/password; SimpleJWT/custom serializer active-user/company checks | access/refresh; tenant.User; identity fetched separately through users/me; token refresh/logout siblings |
| `GET /api/v1/tenant/users/me/` | authenticated identity | UserSerializer and company/entity capabilities; browser auth bootstrap |
| `POST /api/v1/devices/portfolio/add/` | device_id; capability, launch/lifecycle, company/entity scope | Portfolio service snapshot/change/projection; verify exact payload in BuyerPortfolioViewSet |
| `GET, POST /api/v1/catalog/products/` | list filters or Product serializer; vendor scope/category/date/compatibility/media gates | Role-dependent product fields; Product and source/projection services; wholesale hidden from buyers |
| `POST /api/v1/catalog/export-jobs/create_job/` | Frozen selection fields from export serializer; buyer triad/current eligibility | BuyerProductExportJob and selection snapshot; queued export task; completed output is historical |
| `POST /api/v1/routing/orders/` | OrderCreateSerializer; buyer/entity/storefront scope, exported mapping resolution, quantity/customer fields and idempotency | AcceptedOrderLine, supplier suborders, frozen pricing/selection; no global SKU supplier choice |
| `POST /api/v1/procurement/purchase-orders/` | PO + nested lines/customer_shipping; Product/PO line validation and frozen MSRP/unit price | PO with line transaction; some storefront/API-key paths auto-approve; orchestration limitations apply |
| `POST /api/v1/procurement/purchase-orders/{pk}/approve/` | approval capability and scoped object | approved state and older PO orchestration; no claim of actual external delivery |
| `POST /api/v1/invoicing/invoices/create-from-orders/` | type/counterparty/period, ISO dates, end ≥ start; permission checked in action | Run/period/invoice/lines; exceptions for invalid source prices; invoice module transition tables |
| `POST /api/v1/integration/vendor-catalog-connections/{pk}/sync/` | admin connection, saved API mode, available vendor, config validated; active-run dedup | Durable VendorCatalogSyncRun; bounded page task/budget/source adapter; no synchronous provider success guarantee |
| `POST /api/v1/integration/webhooks/{receiver_id}/` | Signature+timestamp, active vendor/profile, body limits, allowed event type and event ID | Receipt dedup; accepted/duplicate/ignored/error JsonResponse; failed processing retained for inspection |

These are navigation summaries, not substitute contracts. Use the reference and
actual handler for complete nested fields, dynamic serializer selection, exact
state/error codes, side effects and caller behavior. Feature IDs link these shared
surfaces in [FEATURE_REGISTRY.md](FEATURE_REGISTRY.md).
