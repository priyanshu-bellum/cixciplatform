# Session handoff

Active task: TASK-011 — completed.

Local operations checkpoint (2026-11-19): Docker checked; local backend/frontend
rebuilt with docker-compose.local-copy.yml and restarted using
`up -d --no-deps --force-recreate backend frontend`. Both running image IDs match
rebuilt tags (backend 315e44fad24b, frontend 990a99ab96c8). Frontend GET 200,
backend login OPTIONS 200 and catalog GET 403 without authentication all passed.
PostgreSQL/Redis were not restarted and remain healthy. Build output has only a
nonblocking Vite large-chunk warning. Evidence: .local-copy/operations/ build log
and restart-smoke.json. No code edits/new tests/migrations/imports/provider jobs.
Next: use frontend at http://localhost:5173/ and backend at http://localhost:8000/;
resume other implementation only when requested. Earlier handoff details below
are preserved. Root startup/task consistency validator passed; no fresh structural
inventory was collected for this operational task.

Checkpoint: 2026-11-19, production bugfixes + client issue backlog session.

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

## Remaining work

1. **Migrations on production** — 0041-0045 need to be applied after prod DB clone testing

## Important notes

- Migrations 0041-0045 applied to local Docker — not yet on production
- All repo changes are uncommitted — user must test against prod DB clone before push
- Deployment: rsync from `/srv/cixci_repo/` to test/live, then `docker compose up`
- Resync from Balaji API will auto-fix existing products (normalization in import flow)
- Reference docs: `docs/CIXCI_Product_Data_Normalization_*.docx`, `docs/CIXCI_Category_Governance_*.docx`
