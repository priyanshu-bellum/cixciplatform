# CIXCI - Recent Changes & Current State

> Last updated: 2026-10-22
> All commits by: dev-soumyajit (Soumyajit Khan)

---

## Current Development Phase

The project is in a **feature-completion and polish phase** — building out remaining frontend pages, fixing data display bugs, enforcing business rules (media validation), and improving UX flows.

**Active focus area**: Media/image upload pipeline + Catalog bulk import workflow.

---

## Last 30 Commits (newest first)

```
3886480 feat: add FulfillmentPage and InvoicingPage frontend components
8c7233b fix(media): replace legacy primary image on ZIP upload
6f4d2e1 fix(catalog): make image ZIP upload reachable and repair activation
80fa0cd docs: add step 2 image upload test kit
1006f9b docs: add bulk product import template
626a82e feat(catalog): two-step bulk import with ZIP image upload
cab5f9e feat(media): attach product images and auto-activate staged products
e9a7e84 fix(devices): company-scoped portfolio projections with fan-out and self-heal
1a197ed feat(pricing): buyer-facing price list with tenant scoping
d2c222b fix(catalog): vendor product modal label and wholesale-price field
c461791 feat: add FulfillmentPage and InvoicingPage frontend components
0fb3f12 feat(sidebar): add logout confirmation dialog
58bc877 fix(catalog): date format corrections and vendor wholesale price
f0e10a1 fix: media validation rules and client bug deck
a0ed7a5 fix(orders): date format for shipped/delivered
345db30 refactor(typography): update typography properties
80b9601 feat(invoicing): automated invoice generation from procurement
b606625 fix(invoicing): vendor invoices tracing via PO lines
14b1a5a fix(analytics): add missing created_at on DataFreshnessMarker
736439e fix(pricing): handle zero/unset wholesale prices in validation
7e0946c feat(catalog): sample data seeder management command
68142a0 feat(catalog): server-side pagination and N+1 removal
ff81e30 feat: add CatalogPage and MediaPage frontend components
c90114a fix(orders): serializer and vendor wholesale price validation
0d285b3 feat(analytics): seeding pipeline and dashboard counts
cc66e83 fix(catalog): JSX closing tag mismatch in filter bar
a5ad3ac feat: add OrdersPage, ProcurementPage, TelcoCellularPage
bf24fdc feat: add API serializers and viewsets for order routing
ddd9ebe feat: add shared services API and invoicing endpoints
5c75ad3 feat: add DashboardPage, DevicesPage, and PricingPage
2f04d3a feat: scaffold React frontend with auth, layout, and theme
```

---

## Feature Summary (What's Been Built)

### Media & Image Pipeline (Major)
- Presigned upload flow with server-side PNG transparency validation
- ZIP bulk upload that matches images to SKUs
- Auto-activation of products when media-ready (Inactive only, no hold, dates valid)
- Primary image replacement with confirmation and archival
- Business rules documented in `rules.txt` (422 lines)

### Catalog System
- Full product CRUD with lifecycle management
- Two-step bulk import: CSV/Excel upload -> ZIP image upload
- Server-side pagination, filtering, N+1 query fixes
- Sample data seeder (`seed_sample_catalog` management command)
- Compatibility engine with buyer-scoped projections

### Device Compatibility
- Company-scoped (not user-scoped) portfolio projections
- Fan-out projection recalculation to all buyer users in entity
- Self-healing for missing/stale projections on read

### Pricing
- Buyer-facing price list endpoint (`/pricing/buyer-prices/`)
- Vendor wholesale prices hidden from buyers
- MAP enforcement, discount rules
- Zero/unset wholesale price handling fixed

### Orders & Routing
- Order management with vendor routing
- Vendor export governance with batch processing
- Date formatting fixes (MM-DD-YYYY)

### Fulfillment
- Shipments, returns, SLA tracking
- Frontend FulfillmentPage component

### Invoicing
- Automated invoice generation from procurement orders
- Vendor invoice tracing via PO lines
- Frontend InvoicingPage component

### Analytics
- Seeding pipeline, dashboard counts
- DataFreshnessMarker fix (missing created_at)

### Frontend (All Pages Built)
- Dashboard, Catalog, Devices, Media, Orders, Fulfillment, Invoicing
- Pricing, Procurement, TelcoCellular, Analytics, Integration, Launch
- Login, Confirm Email, Reset Password, Company Users, Notifications
- Sidebar with logout confirmation dialog

---

## Bugs Fixed (Recent)

| Commit | Module | What Was Broken |
|--------|--------|----------------|
| `8c7233b` | Media | ZIP-uploaded PNG attached as secondary instead of replacing legacy JPEG primary — products stayed hidden from buyers |
| `6f4d2e1` | Catalog | Image ZIP upload unreachable (depended on import modal auto-advancing); duplicate image re-upload didn't reconcile activation |
| `e9a7e84` | Devices | My Compatibility tab empty for buyers whose colleague added devices (portfolio was per-user, not per-company) |
| `d2c222b` | Catalog | Vendor modal showing "Wholesale Price" instead of "Vendor Wholesale Price" |
| `58bc877` | Catalog | Dates not in MM-DD-YYYY format; vendor wholesale price value incorrect |
| `a0ed7a5` | Orders | Shipped/Delivered dates not MM-DD-YYYY |
| `f0e10a1` | Multiple | Media validation rules fixes + client bug deck |
| `14b1a5a` | Analytics | Missing `created_at` on DataFreshnessMarker broke cursor pagination (500 errors) |
| `b606625` | Invoicing | Vendor invoices not showing — fixed by tracing via PO lines |
| `736439e` | Pricing | Validation crashed when wholesale price was 0 or unset |
| `cc66e83` | Catalog | JSX closing tag mismatch (`div` vs `Box`) in CatalogPage filter bar |
| `c90114a` | Orders | Serializer/tests not handling vendor wholesale price and routing snapshot validation |

---

## Known Issue

- Commit `3886480` includes `docs/~$CIXCI_Bulk_Product_Template.xlsx` — this is a Microsoft Office temp/lock file (165 bytes). Should be added to `.gitignore` and removed from tracking.

---

## Key Files Changed in Last 5 Commits

| File | Changes |
|------|---------|
| `frontend/src/pages/FulfillmentPage.tsx` | New/updated fulfillment UI |
| `frontend/src/pages/InvoicingPage.tsx` | New/updated invoicing UI |
| `backend/apps/media/services.py` | Fix: legacy primary image replacement on ZIP upload |
| `backend/apps/catalog/api.py` | Fix: ZIP upload reachability, activation reconciliation |
| `frontend/src/pages/CatalogPage.tsx` | Fix: ZIP upload flow in UI |
| `docs/CIXCI_Bulk_Product_Template.xlsx` | Bulk import template |
| `docs/CIXCI_Step2_Image_Upload_Test.xlsx` | Step-2 test kit |
| `docs/CIXCI_Step2_Test_Images.zip` | Test images for step-2 |

---

## What's Next (Likely)

Based on the trajectory:
- More bug fixes from client testing (the "bug deck" pattern)
- Remaining frontend polish across all pages
- Integration testing and API hardening
- Notifications system wiring
- Analytics deeper implementation
- Launch module completion