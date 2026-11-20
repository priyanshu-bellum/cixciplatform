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
