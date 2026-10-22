# CIXCI Platform - Project Structure Context

> Last updated: 2026-10-22

## What is CIXCI?

A **B2B Accessory Commerce Platform** — manages device-accessory catalog, orders, fulfillment, invoicing, and vendor management across multiple companies/tenants.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 5.0.6 + DRF 3.15.2 |
| Frontend | React 19 + TypeScript + MUI v9 |
| Database | PostgreSQL 16 (SQLite for local dev) |
| Cache/Queue | Redis 7 + Celery 5.4 |
| Build | Vite (frontend), Docker Compose |
| State | Zustand (auth) + TanStack Query v5 (server) |
| Auth | JWT (SimpleJWT) + API Keys |
| Storage | S3/Cloudflare R2 or GCS (configurable) |

---

## Backend Structure (`backend/`)

### Config: `backend/config/`
- `settings.py` — Main Django settings (14 apps, JWT, CORS, Redis, Celery, storage)
- `urls.py` — All API routes under `/api/v1/`
- `celery.py` — Celery task queue config
- `exceptions.py` — Custom DRF exception handler
- `pagination.py` — Cursor-based pagination

### 14 Django Apps (`backend/apps/`)

#### Phase 1: Foundation
| App | Key Models | Purpose |
|-----|-----------|---------|
| **tenant** | Company, User, CompanyEntity, Capability, Role | Multi-tenancy, auth, permissions |
| **audit** | AuditLog, FileTracking | Logging & file audit trail |
| **notification** | Notification, NotificationTemplate, EmailQueue | Email, in-app, SMS notifications |
| **media** | MediaAsset, UploadSession, Rendition | Image/media management, ZIP uploads |

#### Phase 2: Catalog
| App | Key Models | Purpose |
|-----|-----------|---------|
| **devices** | Device, DeviceType, Manufacturer, BuyerDevicePortfolioSnapshot | Device catalog, buyer portfolios |
| **catalog** | Product, ProductCompatibilityAssertion, BuyerScopedCompatibilityProjection | Product lifecycle, compatibility engine |

#### Phase 3: Commerce
| App | Key Models | Purpose |
|-----|-----------|---------|
| **pricing** | EffectivePrice, BuyerPricing, PricingRule | Buyer-specific pricing, MAP enforcement |
| **routing** | Order, RoutedSuborder, VendorExportBatchItem | Order routing, vendor exports |
| **fulfillment** | Shipment, Return, VendorSLA, FulfillmentActivity | Shipping, returns, SLA tracking |

#### Phase 4: Finance
| App | Key Models | Purpose |
|-----|-----------|---------|
| **invoicing** | Invoice, InvoiceLineItem, Payment, PaymentPlan | Invoices, payments |
| **integration** | ExternalConnection, APIKey, WebhookLog | Third-party integrations |

#### Phase 5: Intelligence
| App | Key Models | Purpose |
|-----|-----------|---------|
| **analytics** | AnalyticsEvent, DashboardMetric | Event tracking, dashboards |
| **procurement** | PurchaseOrder, PurchaseOrderLineItem | Purchase order management |

#### Phase 6: Launch
| App | Key Models | Purpose |
|-----|-----------|---------|
| **launch** | LaunchEvent, LaunchProduct | Product launch events |

### Shared Code
- `apps/shared_api.py` (81KB) — Combined viewsets for Media, Analytics, Integration, Procurement, Launch
- `apps/tenant/mixins.py` — CheckAccessMixin, BuyerScopedQuerysetMixin
- `apps/tenant/services.py` (56KB) — Authorization gate (`check_access`), user provisioning

### API URL Pattern
```
/api/v1/auth/login/
/api/v1/tenant/users/me/
/api/v1/devices/list/
/api/v1/catalog/products/
/api/v1/pricing/effective-prices/
/api/v1/routing/orders/
/api/v1/fulfillment/shipments/
/api/v1/invoicing/invoices/
/api/v1/media/assets/
/api/v1/notifications/
/api/v1/analytics/events/
/api/v1/integration/connections/
/api/v1/procurement/purchase-orders/
/api/v1/launch/events/
```

---

## Frontend Structure (`frontend/src/`)

### Pages (20 total)
| Page | Size | Description |
|------|------|-------------|
| `CatalogPage.tsx` | 384KB | Product management, bulk import, ZIP image upload |
| `DevicesPage.tsx` | 117KB | Device catalog, compatibility |
| `TelcoCellularPage.tsx` | 110KB | Telco/cellular device management |
| `FulfillmentPage.tsx` | 103KB | Shipments, returns, SLA |
| `DashboardPage.tsx` | 73KB | Main dashboard with metrics |
| `InvoicingPage.tsx` | 63KB | Invoice management |
| `OrdersPage.tsx` | 58KB | Order management |
| `StubPages.tsx` | 171KB | Multiple stub/placeholder pages |
| `MediaPage.tsx` | 34KB | Media asset management |
| `CompanyUsersPage.tsx` | 34KB | User management |
| `AnalyticsPage.tsx` | 18KB | Analytics dashboard |
| `IntegrationPage.tsx` | 17KB | Third-party integrations |
| `PricingPage.tsx` | 11KB | Pricing management |
| `LoginPage.tsx` | 10KB | Auth login |
| Others | <10KB | Launch, Notifications, Procurement, Reset Password, Confirm Email |

### Components (`components/`)
```
components/
  AppLayout.tsx          — Main layout wrapper
  Sidebar.tsx            — Navigation sidebar
  Pagination.tsx
  AddressAutocomplete.tsx
  data-display/          — DataTable, EmptyState, StatusChip, StatCard, MonoText
  feedback/              — SnackbarProvider, ConfirmDialog, ErrorBoundary, LoadingOverlay
  forms/                 — FormField, FileUploadField, MultiSelect, SearchBar
  layout/                — PageHeader
  navigation/            — TabPanel
```

### State & Data
- `stores/authStore.ts` — Zustand store (login, logout, token management)
- `lib/apiClient.ts` — Axios with JWT interceptors, auto-refresh, 401 redirect
- `lib/formatters.ts` — Date/currency formatting
- `lib/constants.ts` — US states, enums
- `hooks/` — useConfirmDialog, useDebouncedValue, useThemeMode

### Theme (`theme/`)
- MUI light/dark palettes, typography, component overrides

---

## Key Architecture Patterns

1. **Multi-Tenancy**: TenantIsolationMiddleware + buyer-scope triad (company_scope_reference, buyer_reference, buyer_entity_reference)
2. **Capability-Based Auth**: Fine-grained permissions via `check_access()` — buyers vs vendors see different data
3. **Bounded Contexts**: 14 independent domains with explicit dependencies (documented in ADRs)
4. **Projection Pattern**: Device compatibility projections fan-out to buyer users, self-heal on read
5. **Presigned Upload Flow**: Media uploads via presigned URLs, server-side validation
6. **Celery Beat Tasks**: `evaluate_vendor_slas` (15min), `run_manual_vendor_exports` (15min)

---

## Dev Commands (Makefile)

```bash
# No Docker (SQLite)
make dev              # Run backend
make dev-migrate      # Migrations
make dev-superuser    # Create admin
make dev-test         # Run tests

# Docker (PostgreSQL + Redis)
make up / make down   # Start/stop services
make migrate          # Run migrations
make test             # Run tests
make frontend         # Start React dev server
```

---

## Important Files to Know

| File | Why |
|------|-----|
| `backend/config/settings.py` | All Django config, app registration |
| `backend/config/urls.py` | All API route registration |
| `backend/apps/tenant/services.py` | Authorization logic (56KB) |
| `backend/apps/catalog/api.py` | Product API (3,981 lines) |
| `backend/apps/catalog/compatibility_engine.py` | Compatibility logic (29KB) |
| `backend/apps/shared_api.py` | Shared viewsets (81KB) |
| `frontend/src/pages/CatalogPage.tsx` | Biggest frontend page (384KB) |
| `frontend/src/lib/apiClient.ts` | API client with auth |
| `frontend/src/stores/authStore.ts` | Auth state |
| `rules.txt` | 422-line business rules document |
