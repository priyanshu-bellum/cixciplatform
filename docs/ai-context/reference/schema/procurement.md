# procurement — model definition reference

Generated from Django metadata using test settings. No database queried.
This describes checked-in definitions, not applied/deployed schema.

## procurement.PurchaseOrder

Table: `procurement_purchase_order`. Source: [backend/apps/procurement/models.py](../../../../backend/apps/procurement/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `buyer_reference` / `buyer_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=30; default="draft"` | `—` |
| `pricing_snapshot_reference` / `pricing_snapshot_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `po_number` / `po_number` | `CharField` | `NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `currency` / `currency` | `CharField` | `NOT NULL; length=3; default="USD"` | `—` |
| `total_amount` / `total_amount` | `DecimalField` | `NULL; blank allowed; precision=14, scale=4; default="<not set>"` | `—` |
| `approved_at` / `approved_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `submitted_at` / `submitted_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["draft","Draft"],["pending_approval","Pending Approval"],["approved","Approved"],["submitted","Submitted"],["acknowledged","Acknowledged"],["partially_fulfilled","Partially Fulfilled"],["fulfilled","Fulfilled"],["cancelled","Cancelled"],["rejected","Rejected"],["expired","Expired"],["dispute","Dispute"],["closed","Closed"]]`

Indexes: `[["django.db.models.Index",[],{"name":"procurement_company_58b02a_idx","fields":["company_scope_reference","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## procurement.PurchaseOrderLine

Table: `procurement_purchase_order_line`. Source: [backend/apps/procurement/models.py](../../../../backend/apps/procurement/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `purchase_order` / `purchase_order_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `procurement.PurchaseOrder; PROTECT; reverse=lines` |
| `product_reference` / `product_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `quantity` / `quantity` | `PositiveIntegerField` | `NOT NULL; default="<not set>"` | `—` |
| `unit_price_snapshot` / `unit_price_snapshot` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `msrp_snapshot` / `msrp_snapshot` | `DecimalField` | `NULL; blank allowed; precision=12, scale=4; default="<not set>"` | `—` |
| `line_total` / `line_total` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## Migrations

- [backend/apps/procurement/migrations/0001_initial.py](../../../../backend/apps/procurement/migrations/0001_initial.py)
- [backend/apps/procurement/migrations/0002_purchaseorderline_msrp_snapshot.py](../../../../backend/apps/procurement/migrations/0002_purchaseorderline_msrp_snapshot.py)
- [backend/apps/procurement/migrations/0003_update_msrp_line_totals.py](../../../../backend/apps/procurement/migrations/0003_update_msrp_line_totals.py)
