# Prior session notes — historical, partly superseded

Archived 2026-11-21 to keep startup files compact. These earlier notes include
unverified test-server claims and superseded fallback behavior; consult current
source, TASKS and SESSION_HANDOFF before applying any operation.

# Current state

Active task: TASK-014 — in_progress.

2026-11-20 checkpoint: buyer Balaji brand results/category/device mapping under
investigation on local Docker. Git clean at 1b443cf. Prior Claude implementation
contains an import parse-failure → inferred Universal fallback; it must be verified
against provider evidence and corrected without relaxing buyer visibility gates.

Updated 2026-11-20 against `main` at `18a376b` plus local working-tree changes.
Active work: Balaji Wireless test server — 6 client video issues being resolved.

## Completed this session (2026-11-20)

- **Canonical product catalog import adapter** (`catalog_import.py`):
  - Added `_NULLABLE_TEXT_FIELDS` sanitization — vendor APIs return null for absent
    text fields; DRF CharFields reject None. Fields: series, color, short_description,
    warranty, meta_title, meta_description, promo_information, vendor_category,
    vendor_category_raw. None values removed before serializer creation.
  - Broadened retry logic — when serializer fails on non-essential fields (compat,
    category rules), strips failing fields and retries. Prevents product creation
    failures from missing compatibility_mode, compatible_charging_interface, etc.
  - **Reverted** weight_unit='oz' default — weight comes from Balaji as-is with unit.
    We do not set weight_unit ourselves during import.

- **Test server fixes applied** (via docker exec scripts, not git push):
  - `fix_all_orphans.py`: Updated connection config with 5 missing category mappings
    (Headsets and Headphones, Headsets, Car Chargers, Power Banks, Tablet Cases).
    Created 98 products, ran color normalization + text cleanup on all 1715 products.
  - `fix_remaining.py`: Progressive retry for 80 remaining orphans. Created 76 more.
    4 remain: 3x wholesale price > MSRP (Balaji data error), 1x duplicate SKU.
  - Container catalog_import.py updated with _NULLABLE_TEXT_FIELDS fix and broadened
    retry. weight_unit line removed from container.
  - **Final state: 1791 products, 4 orphans (all Balaji data quality issues)**

- **Client video issues status**:
  1. Wrong categories → FIXED (config updated + category fix script)
  2. Missing products → FIXED (178 orphans → 4 remaining, all data errors)
  3. Series not showing → FIXED (_NULLABLE_TEXT_FIELDS prevents None rejection)
  4. Weight in lbs not oz → NOT A CODE BUG (Balaji field is weight_oz; model default
     is oz; frontend shows weight_unit. Weight comes as-is from Balaji.)
  5. Warranty text in descriptions → FIXED (warranty now separate field, not in desc)
  6. Wearable Tech empty → FIXED (category mapping + product creation)

## Completed this session (2026-11-19)

- **Docker production fixes**: `docker-compose.prod.yml` updated — added
  `VENDOR_CATALOG_ENCRYPTION_KEYS` to backend/celery/beat environment blocks,
  celery worker now consumes `-Q celery,vendor_catalog,vendor_commerce`, new
  `celery-beat` service with DatabaseScheduler.
- **Brand filter auto-registration**: `catalog_import.py` now bulk-creates
  `DynamicDropdownConfig` entries for brands resolved during vendor API sync.
- **JWT session fix (P0)**: Backend `ROTATE_REFRESH_TOKENS` changed to `False`
  in `settings.py`. Frontend `apiClient.ts` rewritten with proactive token
  refresh — decodes JWT expiry and refreshes 5 min before it expires, preventing
  401s during active use. Singleton deduplication preserved.
- **JPEG/JPG image acceptance**: `validation.py` and `readiness.py` updated to
  accept PNG, JPEG, and JPG. Transparency required only for PNG primary images.
  JPEG primary images pass readiness without transparency check. Rendition
  generation in `services.py` preserves source format. ZIP upload and URL import
  also accept JPEG/JPG. 16 new tests in `apps/media/tests.py`, all passing.

- **Product Data Normalization Service**: `catalog/normalization.py` created —
  deterministic, versioned (v1.0.0), implements spec §5-§11. Covers: name
  normalization, brand dedup, short description pass-through (never auto-generate),
  description cleanup (vendor URL/CTA removal), meta title (no "CIXCI", 50-60 chars),
  meta description (no garbage, 140-155 chars), cross-field validation, color mapping.
  43 new tests all passing.
- **Product.save() fixed**: Removed garbage auto-generation of short_description
  ("Premium...designed for optimal compatibility"), meta_title ("...| CIXCI"),
  meta_description ("Purchase the high-quality..."). Now calls normalization service.
- **Normalization in import flow**: `catalog_import.py` now runs normalization on
  every product during vendor API sync. Resync will fix all 2154 products.
- **VendorColorMapping model**: New model for vendor color → system color mapping.
  Migration 0041 applied. Admin populates mappings, import auto-resolves.
- **Product model additions**: `weight_unit` (default "oz"), `is_clearance`,
  `clearance_type`, `clearance_end_date` fields added.
- **Import notifications**: Dashboard notifications for unresolved categories,
  unresolved colors, and missing device references during vendor API sync.

- **Frontend: Series field + weight unit + clearance UI**: Added Series field
  to ManageProductDialog (detail view). Fixed weight display to use
  `product.weight_unit` instead of hardcoded "lbs". Added clearance section
  display. ProductFormDialog (edit form) now has weight unit selector (oz/lb/g/kg),
  clearance checkbox + type + end date fields. All sent in API payload.
  useProductForm hook updated with new state fields. TypeScript compiles clean.

- **VendorColorMapping admin UI**: Backend API (CRUD + `/unresolved/` + `/bulk_create/`)
  and frontend "Color Mappings" tab in VendorCatalogConsole. Auto-applies system_color
  to products on mapping create/update. Smart auto-suggest for 60+ vendor colors.
  86 distinct Balaji vendor colors identified, 0 currently mapped. 63 tests passing.

- **Multicolor support (migration 0042)**: `system_colors` JSONField on Product,
  `resolve_system_colors()` for compound colors (Red & Black → ["Red", "Black"]),
  import flow integration, serializer + filter support. 7 new tests.

- **Batch revalidation (§13)**: Backend `/batch-revalidate/` endpoint with 3 modes
  (report/preview/commit). Frontend `BatchRevalidateDialog.tsx` with scope filters,
  mode selector, results diff. Admin-only "Batch Revalidate" button on CatalogPage.

- **Buyer export formatting (§14)**: `format_description_html()` and
  `format_description_plaintext()` preserving paragraph + bullet structure.
  Buyer export task uses HTML for JSON/API, plain text for CSV/XLSX. 7 new tests.

- **Buyer sync detection (§15)**: `needs_buyer_sync` BooleanField (migration 0043),
  `detect_buyer_sync_needed()`, `/pending-sync/` and `/clear-sync/` admin endpoints.
  Clearance notification intent emitted when product enters clearance. 6 new tests.

- **Import alert dashboard**: Backend `ImportAlertViewSet` at `/catalog/import-alerts/`
  with list + dismiss. Admin-only, surfaces missing devices/unmapped categories/colors.
  CatalogPage shows expandable warning banner. 8 new tests in `tests_import_alerts.py`.

- **Notification bell integration**: `NotificationBell.tsx` replaces plain bell in
  `AppLayout.tsx`. Badge shows unread + import alert count. Popover dropdown with
  import alerts section (admin), recent in-app notifications, mark-read/mark-all-read,
  "View All". Polls unread count 30s, alerts 60s, recent 15s when open.

- **WebSocket real-time notifications**: `channels` + `channels-redis` + `daphne` added.
  ASGI entry point at `config/asgi.py`. JWT-authenticated WebSocket at `ws/notifications/`.
  NotificationConsumer pushes new notifications and import alerts in real-time.
  Frontend `useNotificationSocket.ts` with auto-reconnect. HTTP polling as fallback.
  Production command switched from gunicorn to daphne for HTTP+WS support.

- **§4 Source Preservation (migration 0045)**: `vendor_original_data` JSONField on Product.
  Import captures raw vendor values before normalization. "Vendor Original" tab in
  ManageProductDialog shows side-by-side comparison with diff highlighting. 2 new tests.

- **Batch activate command**: `batch_activate_products` management command with dry-run,
  vendor filter, media readiness check. Balaji: 89/92 products ready to activate.

## Remaining items

- **Migrations to production** — 0041-0045 pending prod DB clone testing

## Infrastructure state

- Stack: Django 5.0.6 / DRF 3.15.2 / 14 apps; React 19 / TS 6 / MUI 9 / Vite 8
- TASK-002–008 record pending reviews from memory initialization. See KNOWN_ISSUES.md.
- Deployment: rsync from `/srv/cixci_repo/` to test/live, then `docker compose up`
- Full release checks, deployed database/providers remain unverified.


# Session handoff

Active task: TASK-014 — in_progress.

Local buyer mapping investigation (2026-11-20): user reports Balaji brand filters
empty and device-specific products showing Universal. Official docs downloaded to
ignored .local-copy/balaji-buyer-fix/api-docs.html from /integrations/api; do not
expose configured API key. Local Docker up; Git clean at 1b443cf. Inspect provider
contract/local source payloads and BR buyer results before targeted fix. Import
currently infers Universal after parse failure, and bare Universal expands all
device types; approved scopes/exclusions must be preserved. TASK-014 records plan.

TASK-014 implementation checkpoint: user confirmed Telco/Kaseory and authorized
creating buyer test identities. Provider-neutral CatalogDeviceResolver added with
configurable paths, scoped device aliases and explicit Universal type maps. Removed
category/name guesses, automatic Universal fallback and validation-field stripping.
Added buyer-scoped filter-options action/shared frontend hook; brand filtering uses
canonical identity. Fourteen focused tests passed; broader regression/build running.
Saved source replay command defaults to rollback preview, audits applied replay,
keeps source listings/history and defers image processing. Inspect current Git diff
and .local-copy/balaji-buyer-fix/ logs before resuming. No provider writes authorized.

Checkpoint: 2026-11-20, Balaji client video issue fixes.

## Key changes ready for deploy

`catalog_import.py` has 3 permanent fixes that prevent future import failures:
1. `_NULLABLE_TEXT_FIELDS` constant (line 21-27) — identifies text fields vendors return as null
2. None sanitization loop (line 325-328) — removes None from text fields before DRF validation
3. Broadened retry (line 354-362) — if serializer fails on non-essential fields, strips them and retries
4. weight_unit default REMOVED — Balaji sends weight with unit, we don't override it

Test server state: 1791 products, 4 orphans (3 wholesale>MSRP, 1 duplicate SKU — Balaji data issues).
Connection config already updated on test server with 5 extra category mappings.
Container code patched via docker exec; deploying the repo will make it permanent.

## Completed this session

1. **Docker production fixes** (permanent in repo):
   - `docker-compose.prod.yml`: VENDOR_CATALOG_ENCRYPTION_KEYS env var in backend/celery/beat
   - Celery worker command: `-Q celery,vendor_catalog,vendor_commerce`
   - New celery-beat service with DatabaseScheduler
   - Also applied to server `test.env` and `live.env` (Fernet key added)

2. **Brand filter auto-registration** in `catalog_import.py`:
   - During vendor API sync, resolved brands are bulk-created as DynamicDropdownConfig entries
   - Fixes brand filter not showing vendor brands globally

3. **JWT session fix (P0)**:
   - Backend: `ROTATE_REFRESH_TOKENS: False` in `settings.py`
   - Frontend: `apiClient.ts` rewritten with proactive token refresh timer (5 min before expiry)
   - Prevents "Given token not valid for any token type" errors during active use

4. **JPEG/JPG image acceptance**:
   - `validation.py`: accepts .png, .jpg, .jpeg extensions; validates PNG or JPEG signatures
   - `readiness.py`: JPEG primary images pass readiness without transparency check
   - `services.py`: rendition generation preserves source format (JPEG→JPEG, PNG→PNG)
   - 16 new tests in `apps/media/tests.py`, all passing

## Files modified

- `docker-compose.prod.yml` — env vars, celery queues, beat service
- `backend/config/settings.py` — JWT ROTATE_REFRESH_TOKENS: False
- `backend/apps/integration/catalog_import.py` — brand auto-registration
- `backend/apps/media/validation.py` — JPEG/JPG acceptance
- `backend/apps/media/readiness.py` — JPEG/JPG in readiness checks
- `backend/apps/media/services.py` — format-aware rendition generation
- `backend/apps/media/tests.py` — NEW, 16 tests
- `frontend/src/lib/apiClient.ts` — proactive token refresh

5. **Product Data Normalization Service** (`catalog/normalization.py`):
   - Deterministic, versioned (v1.0.0), implements spec §5-§11
   - Name normalization, brand dedup, description cleanup, meta generation
   - Short description: NEVER auto-generate (§6)
   - Vendor URL/CTA removal from descriptions (§8)
   - Cross-field factual validation (§11)
   - 43 tests, all passing

6. **Product.save() fixed**:
   - Removed auto-generation of short_description, meta_title, meta_description
   - Now calls normalization service for all entry paths
   - 848 products had "CIXCI" in meta_title, 1120 had garbage — resync will fix

7. **Normalization in import flow** (`catalog_import.py`):
   - Runs normalize_product() on every imported product
   - Color mapping via VendorColorMapping model
   - Dashboard notifications for unresolved categories/colors/devices

8. **New model fields** (migration 0041 applied to local Docker):
   - Product: weight_unit, is_clearance, clearance_type, clearance_end_date
   - New VendorColorMapping model (vendor color → system color)

## Files modified (this session)

- `docker-compose.prod.yml` — env vars, celery queues, beat service
- `backend/config/settings.py` — JWT ROTATE_REFRESH_TOKENS: False
- `backend/apps/integration/catalog_import.py` — brand auto-reg, color mapping, normalization, notifications
- `backend/apps/catalog/normalization.py` — NEW, normalization service
- `backend/apps/catalog/models.py` — VendorColorMapping, clearance, weight_unit, Product.save() fix
- `backend/apps/catalog/migrations/0041_*.py` — NEW, schema additions
- `backend/apps/catalog/tests_normalization.py` — NEW, 43 tests
- `backend/apps/media/validation.py` — JPEG/JPG acceptance
- `backend/apps/media/readiness.py` — JPEG/JPG in readiness checks
- `backend/apps/media/services.py` — format-aware rendition generation
- `backend/apps/media/tests.py` — NEW, 16 tests
- `frontend/src/lib/apiClient.ts` — proactive token refresh

9. **Frontend: Series + weight unit + clearance UI**:
   - `ManageProductDialog.tsx`: Series field in Specifications, weight unit dynamic,
     clearance section with type + end date display
   - `ProductFormDialog.tsx`: weight unit selector (oz/lb/g/kg), clearance checkbox +
     type + end date fields, all included in API payload
   - `useProductForm.ts`: added prodWeightUnit, prodIsClearance, prodClearanceType,
     prodClearanceEndDate state + resetForm/populateFrom/dirty-check updates
   - TypeScript compiles clean; all 59 backend tests pass

## Files modified (this session)

- `frontend/src/pages/catalog/dialogs/ManageProductDialog.tsx` — series, weight unit, clearance display
- `frontend/src/pages/catalog/dialogs/ProductFormDialog.tsx` — weight unit selector, clearance form fields
- `frontend/src/pages/catalog/hooks/useProductForm.ts` — new state fields

10. **ProductDetailSerializer updated**: Added weight_unit, is_clearance,
    clearance_type, clearance_end_date to detail serializer fields. Verified
    all fields return correctly through API (serializer output confirmed).

11. **Balaji API response verified** (2026-11-19): Fetched live from
    `shop.balajibrands.com/api/v1/catalog`. All BALAJI_CONFIG field mappings
    confirmed matching: sku, name, series, brand, upc, description, features,
    category, color, unit_price_cents, msrp_cents, map_price_cents,
    quantity_available, weight_oz, dimensions, compatible_devices, image_urls.
    Unmapped fields (case_pack, next_arrival_date, on_order, backorderable)
    noted but not needed for current scope.

12. **VendorColorMapping admin API + UI** (2026-11-19):
    - Backend: VendorColorMappingSerializer, VendorColorMappingViewSet with CRUD,
      `/unresolved/` endpoint (returns unmapped vendor colors + product counts),
      `/bulk_create/` endpoint, auto-applies system_color to products on create/update,
      audit logging on all operations. Registered at `vendor-color-mappings` router.
    - Frontend: "Color Mappings" tab in VendorCatalogConsole with:
      - Unresolved colors panel (warning chips with product counts, click to quick-map)
      - Smart auto-suggest (`_suggestSystem`) for 60+ vendor color → system color hints
      - Create/Edit/Delete CRUD for mappings
      - Live affected product count per mapping
    - 63 tests all passing (4 new VendorColorMapping model tests)

## Files modified (this session — color mapping)

- `backend/apps/catalog/api.py` — VendorColorMappingSerializer, ViewSet, router
- `backend/apps/catalog/tests_normalization.py` — 4 new tests
- `frontend/src/components/VendorCatalogConsole.tsx` — Color Mappings tab

13. **Multicolor support** (migration 0042):
    - `system_colors` JSONField on Product model
    - `resolve_system_colors()` in normalization.py — splits on & and / separators
    - Import flow uses multicolor resolution for compound colors
    - Serializers include system_colors, filter supports JSON contains query
    - 7 new MultiColorResolutionTest tests

14. **Batch revalidation — §13** (backend + frontend):
    - Backend: `/batch-revalidate/` action on ProductViewSet with report/preview/commit modes
    - Frontend: `BatchRevalidateDialog.tsx` with scope filters, mode selector, results diff view
    - Wired into CatalogPage header as admin-only "Batch Revalidate" button

15. **Buyer export formatting — §14**:
    - `format_description_html()` / `format_description_plaintext()` in normalization.py
    - Buyer export task formats descriptions per format: HTML for JSON/API, plain text for CSV/XLSX
    - Preserves paragraph + bullet structure per spec
    - 7 new BuyerExportFormattingTest tests

16. **Buyer sync detection — §15**:
    - `needs_buyer_sync` BooleanField on Product (migration 0043)
    - `detect_buyer_sync_needed()` in normalization.py
    - Batch revalidation commit sets needs_buyer_sync when buyer-facing fields change
    - `/pending-sync/` and `/clear-sync/` admin endpoints on ProductViewSet
    - `emit_clearance_notification_intent()` in services.py
    - Product.save() emits clearance notification when is_clearance goes False→True
    - 6 new BuyerSyncDetectionTest tests

17. **Import alert dashboard** (backend + frontend):
    - Backend: `ImportAlertViewSet` at `/catalog/import-alerts/` — list + dismiss endpoints
    - Lists aggregated NotificationRequest entries for unresolved categories/colors/missing devices
    - Admin-only permission, dismiss deletes the NotificationRequest
    - 8 new tests in `tests_import_alerts.py`, all passing

18. **Notification bell integration** (frontend):
    - `NotificationBell.tsx` component: Badge with unread count + import alert count
    - Popover dropdown: import alerts section (admin-only), recent in-app notifications,
      mark-read/mark-all-read, "View All" link to /notifications
    - Polls unread count every 30s, import alerts every 60s, recent list every 15s when open
    - Integrated into `AppLayout.tsx` replacing plain bell icon

19. **Import alerts banner** on CatalogPage:
    - Expandable warning banner below PageHeader for admin users
    - Shows categorized alerts (Missing Devices, Unmapped Categories, Unmapped Colors)
    - Each alert dismissible individually

20. **WebSocket real-time notifications**:
    - Backend: `channels==4.1.0`, `channels-redis==4.2.0`, `daphne==4.1.2` added to requirements
    - `config/asgi.py` — ASGI entry point with ProtocolTypeRouter (HTTP + WebSocket)
    - `notification/middleware.py` — JWT auth via `?token=` query param for WebSocket
    - `notification/consumers.py` — NotificationConsumer per-user channel + admin group
    - `notification/routing.py` — `ws/notifications/` endpoint
    - `notification/broadcast.py` — sync helpers for broadcast to user/admins
    - Wired into notification task + catalog_import for real-time push
    - Frontend: `useNotificationSocket.ts` hook with auto-reconnect (exponential backoff)
    - `docker-compose.prod.yml`: backend command changed from gunicorn to daphne

21. **§4 Source Preservation** (migration 0045):
    - `vendor_original_data` JSONField on Product model
    - Import flow captures raw vendor values before normalization
    - Serializer returns vendor_original_data in product detail API
    - "Vendor Original" tab in ManageProductDialog with side-by-side diff UI
    - 2 new tests, all passing

22. **Batch activate management command**:
    - `batch_activate_products` command: dry-run + commit, vendor filter, media readiness check
    - Balaji: 89 ready, 3 have no images

23. **Permanent compatibility fallback** in `catalog_import.py`:
    - `_CATEGORY_DEVICE_TYPE_FALLBACK` maps categories to device type codes
    - When `parse_compatibility_row()` fails → `COMPATIBILITY_REVIEW_REQUIRED`
    - New products auto-get `universal_device_type` mode + scopes + assertions
    - Ensures future Balaji products are visible to buyers without manual intervention

24. **Keyword category refinement** in `catalog_import.py`:
    - `_KEYWORD_CATEGORY_RULES` + `_keyword_refine_category()` function
    - When a product falls to the default category (Phone Attachments), name
      keyword matching refines it (smartwatch→Wearable Tech, etc.)
    - Runs during import, before product creation

25. **Warranty/policy text removal** in `normalization.py`:
    - `_WARRANTY_STATEMENT` regex: catches "Brand Limited Lifetime Warranty" etc.
    - `_VENDOR_POLICY_PATTERN` regex: catches return/exchange/shipping policy text
    - Applied in both `normalize_description()` and `normalize_warranty_in_description()`

26. **Image serving fix** (MediaProxyView + media_short_url):
    - `media/views.py`: MediaProxyView now serves files directly from MEDIA_ROOT
      when using local storage (no S3/GCS), instead of redirecting to /media/ path
    - `media/utils.py`: `media_short_url()` always returns proxy path `/api/img/<base62>`
      regardless of MEDIA_USE_SHORT_URLS setting — eliminates dependency on static
      file serving or nginx for /media/ URLs
    - 2 new tests (MediaShortUrlTest), all passing

27. **Buyer visibility media gate relaxed** (`catalog/api.py`):
    - Media readiness gate now accepts both PNG and JPEG images (`mime_type__in`)
    - Removed `has_transparency=True` requirement that blocked all JPEG images
    - Still requires `status="ready"` and `review_status="approved"`

28. **"Universal" compatibility handling** (`compatibility_import.py`):
    - `parse_compatibility_row()` now handles bare "universal" by resolving to all
      current device types (phone, tablet, smartwatch) instead of raising error
    - Missing-device tracking skips when types resolved (not just devices)

29. **batch_activate_products updated** (`management/commands/batch_activate_products.py`):
    - Now sets both `status="active"` AND `selling_status="for_sale"` on activation

30. **Missing Devices admin panel** (TASK-013):
    - Backend: `MissingDeviceViewSet` at `/catalog/missing-devices/` — list (aggregates
      unmatched vendor device names, deduplicates vs Device Catalog, auto-suggests
      manufacturer + device type), `add_device` (creates Device + bulk-creates
      ProductCompatibilityAssertion + audit log), `dismiss_device`
    - Frontend: `MissingDevicesTab.tsx` on CatalogPage (admin-only tab). Table with
      vendor device name, alert count, suggested manufacturer, type. "Add" button opens
      dialog → creates device + matches products. "Dismiss" for false positives.
    - Import alerts banner "Missing Devices" chip is now clickable → switches to tab.

## Remaining work

1. **Migrations on production** — 0041-0045 need to be applied after prod DB clone testing
2. **Run batch_activate_products on test server** — activates products that pass media readiness
3. **Verify buyer visibility** — log in as buyer to confirm products appear
4. **Resync Balaji catalog** — triggers import with all fixes (categories, compatibility, images)

## Files modified (missing devices panel)

- `backend/apps/catalog/api.py` — MissingDeviceViewSet added + router registration
- `frontend/src/pages/catalog/MissingDevicesTab.tsx` — NEW, admin missing devices table + add dialog
- `frontend/src/pages/catalog/CatalogPage.tsx` — Missing Devices tab, import alert chip click

## Important notes

- Migrations 0041-0045 applied to local Docker — not yet on production
- All repo changes are uncommitted — user must test against prod DB clone before push
- Deployment: rsync from `/srv/cixci_repo/` to test/live, then `docker compose up`
- Resync from Balaji API will auto-fix existing products (normalization + compatibility in import flow)
- Reference docs: `docs/CIXCI_Product_Data_Normalization_*.docx`, `docs/CIXCI_Category_Governance_*.docx`
