# pricing — model definition reference

Generated from Django metadata using test settings. No database queried.
This describes checked-in definitions, not applied/deployed schema.

## pricing.BuyerFacingPricingVisibilityEvidence

Table: `pricing_visibility_evidence`. Source: [backend/apps/pricing/models.py](../../../../backend/apps/pricing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `snapshot` / `snapshot_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `pricing.EffectivePriceSnapshot; PROTECT; reverse=(default)` |
| `buyer_reference` / `buyer_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `channel` / `channel` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `tenant_scope_version` / `tenant_scope_version` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `channel_eligibility_reference` / `channel_eligibility_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `product_channel_flag_version` / `product_channel_flag_version` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `redaction_decision` / `redaction_decision` | `CharField` | `NOT NULL; length=30; default="allowed"` | `—` |
| `recheck_before_display` / `recheck_before_display` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `visibility_granted` / `visibility_granted` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `channel`: `[["online_dtc","Online / Direct-to-Consumer"],["bulk_po","Bulk Purchase Order"],["owned_channel","Owned Channel / Kaseory"],["buyer_storefront","Buyer Storefront"],["marketplace","Marketplace (placeholder)"],["retail_pos","Retail POS (placeholder)"],["promotional","Promotional Campaign (placeholder)"],["buyer_contract","Buyer-Specific Contract (placeholder)"]]`

Indexes: `[["django.db.models.Index",[],{"name":"pricing_vis_buyer_r_bf7015_idx","fields":["buyer_reference","channel","visibility_granted"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## pricing.EffectivePriceSnapshot

Table: `pricing_effective_price_snapshot`. Source: [backend/apps/pricing/models.py](../../../../backend/apps/pricing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `pricing_profile` / `pricing_profile_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `pricing.PricingProfile; PROTECT; reverse=snapshots` |
| `product_reference` / `product_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `channel` / `channel` | `CharField` | `indexed; NOT NULL; length=30; default="<not set>"` | `—` |
| `vendor_wholesale_price` / `vendor_wholesale_price` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `vendor_side_commission_amount` / `vendor_side_commission_amount` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `buyer_side_commission_amount` / `buyer_side_commission_amount` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `buyer_facing_price` / `buyer_facing_price` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `currency` / `currency` | `CharField` | `NOT NULL; length=3; default="USD"` | `—` |
| `buyer_pricing_mode` / `buyer_pricing_mode` | `CharField` | `NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `buyer_commission_percentage` / `buyer_commission_percentage` | `DecimalField` | `NOT NULL; precision=5, scale=2; default=14` | `—` |
| `vendor_commission_percentage` / `vendor_commission_percentage` | `DecimalField` | `NOT NULL; precision=5, scale=2; default=0` | `—` |
| `bindability_status` / `bindability_status` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `procurement_bindable` / `procurement_bindable` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `invoice_bindable` / `invoice_bindable` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `valid_from` / `valid_from` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `valid_to` / `valid_to` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `is_current` / `is_current` | `BooleanField` | `indexed; NOT NULL; default=true` | `—` |
| `superseded_by_snapshot` / `superseded_by_snapshot_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `pricing.EffectivePriceSnapshot; PROTECT; reverse=supersedes` |
| `snapshot_hash` / `snapshot_hash` | `CharField` | `NOT NULL; blank allowed; length=512; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `channel`: `[["online_dtc","Online / Direct-to-Consumer"],["bulk_po","Bulk Purchase Order"],["owned_channel","Owned Channel / Kaseory"],["buyer_storefront","Buyer Storefront"],["marketplace","Marketplace (placeholder)"],["retail_pos","Retail POS (placeholder)"],["promotional","Promotional Campaign (placeholder)"],["buyer_contract","Buyer-Specific Contract (placeholder)"]]`
- `bindability_status`: `[["order_bindable","Order Bindable"],["procurement_bindable","Procurement Bindable"],["invoice_bindable","Invoice Bindable"],["export_bindable","Export Bindable"],["not_bindable","Not Bindable"],["requote_required","Requote Required"],["expired","Expired"],["superseded","Superseded"]]`

Indexes: `[["django.db.models.Index",[],{"name":"pricing_eff_product_43099e_idx","fields":["product_reference","channel","is_current"]}],["django.db.models.Index",[],{"name":"pricing_eff_bindabi_f29a02_idx","fields":["bindability_status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## pricing.MapException

Table: `pricing_map_exception`. Source: [backend/apps/pricing/models.py](../../../../backend/apps/pricing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `product_reference` / `product_reference` | `UUIDField` | `indexed; NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `sku` / `sku` | `CharField` | `indexed; NOT NULL; length=255; default="<not set>"` | `—` |
| `buyer_company_reference` / `buyer_company_reference` | `UUIDField` | `indexed; NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `approved_minimum_price` / `approved_minimum_price` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `start_date` / `start_date` | `DateField` | `NOT NULL; default="<not set>"` | `—` |
| `end_date` / `end_date` | `DateField` | `NOT NULL; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=30; default="pending"` | `—` |
| `approval_notes` / `approval_notes` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["pending","Pending"],["approved","Approved"],["rejected","Rejected"]]`

Indexes: `[["django.db.models.Index",[],{"name":"pricing_map_vendor__59ab18_idx","fields":["vendor_company_reference","sku","status"]}],["django.db.models.Index",[],{"name":"pricing_map_buyer_c_601944_idx","fields":["buyer_company_reference","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## pricing.POPricingBindability

Table: `pricing_po_bindability`. Source: [backend/apps/pricing/models.py](../../../../backend/apps/pricing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `snapshot` / `snapshot_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `pricing.EffectivePriceSnapshot; PROTECT; reverse=(default)` |
| `purchase_order_reference` / `purchase_order_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `procurement_bindable_status` / `procurement_bindable_status` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `invoice_bindable_status` / `invoice_bindable_status` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `requote_required` / `requote_required` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `requote_reason` / `requote_reason` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `accepted_price_variance_reference` / `accepted_price_variance_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `pricing_evidence_reference` / `pricing_evidence_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `expires_at` / `expires_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `procurement_bindable_status`: `[["order_bindable","Order Bindable"],["procurement_bindable","Procurement Bindable"],["invoice_bindable","Invoice Bindable"],["export_bindable","Export Bindable"],["not_bindable","Not Bindable"],["requote_required","Requote Required"],["expired","Expired"],["superseded","Superseded"]]`
- `invoice_bindable_status`: `[["order_bindable","Order Bindable"],["procurement_bindable","Procurement Bindable"],["invoice_bindable","Invoice Bindable"],["export_bindable","Export Bindable"],["not_bindable","Not Bindable"],["requote_required","Requote Required"],["expired","Expired"],["superseded","Superseded"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## pricing.PricingProfile

Table: `pricing_profile`. Source: [backend/apps/pricing/models.py](../../../../backend/apps/pricing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `buyer_company_reference` / `buyer_company_reference` | `UUIDField` | `indexed; NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `channel` / `channel` | `CharField` | `indexed; NOT NULL; length=30; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="draft"` | `—` |
| `vendor_side_commission_rate` / `vendor_side_commission_rate` | `DecimalField` | `NULL; blank allowed; precision=6, scale=4; default="<not set>"` | `—` |
| `buyer_side_commission_rate` / `buyer_side_commission_rate` | `DecimalField` | `NULL; blank allowed; precision=6, scale=4; default="<not set>"` | `—` |
| `markup_rate` / `markup_rate` | `DecimalField` | `NULL; blank allowed; precision=6, scale=4; default="<not set>"` | `—` |
| `currency` / `currency` | `CharField` | `NOT NULL; length=3; default="USD"` | `—` |
| `rounding_rule` / `rounding_rule` | `CharField` | `NOT NULL; length=30; default="round_half_up"` | `—` |
| `order_bindable` / `order_bindable` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `procurement_bindable` / `procurement_bindable` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `effective_from` / `effective_from` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `effective_to` / `effective_to` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `channel`: `[["online_dtc","Online / Direct-to-Consumer"],["bulk_po","Bulk Purchase Order"],["owned_channel","Owned Channel / Kaseory"],["buyer_storefront","Buyer Storefront"],["marketplace","Marketplace (placeholder)"],["retail_pos","Retail POS (placeholder)"],["promotional","Promotional Campaign (placeholder)"],["buyer_contract","Buyer-Specific Contract (placeholder)"]]`
- `status`: `[["draft","Draft"],["active","Active"],["superseded","Superseded"],["retired","Retired"]]`

Indexes: `[["django.db.models.Index",[],{"name":"pricing_pro_vendor__e5ecc7_idx","fields":["vendor_company_reference","channel","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## pricing.ReturnAdjustmentPricingEvidence

Table: `pricing_return_adjustment_evidence`. Source: [backend/apps/pricing/models.py](../../../../backend/apps/pricing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `return_reference` / `return_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `original_snapshot` / `original_snapshot_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `pricing.EffectivePriceSnapshot; PROTECT; reverse=return_adjustments` |
| `adjustment_amount` / `adjustment_amount` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `adjustment_currency` / `adjustment_currency` | `CharField` | `NOT NULL; length=3; default="USD"` | `—` |
| `adjustment_reason` / `adjustment_reason` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `line_disposition` / `line_disposition` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## pricing.ShippingFeeSnapshot

Table: `pricing_shipping_fee_snapshot`. Source: [backend/apps/pricing/models.py](../../../../backend/apps/pricing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `source_fee` / `source_fee_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `pricing.VendorRegionalShippingFee; PROTECT; reverse=snapshots` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `region_code` / `region_code` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `fee_amount` / `fee_amount` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `fee_type` / `fee_type` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `currency` / `currency` | `CharField` | `NOT NULL; length=3; default="USD"` | `—` |
| `order_reference` / `order_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `routed_suborder_reference` / `routed_suborder_reference` | `UUIDField` | `indexed; NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `applied_amount` / `applied_amount` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `fee_type`: `[["flat","Flat Rate"],["per_unit","Per Unit"],["percentage","Percentage of Order"]]`

Indexes: `[["django.db.models.Index",[],{"name":"pricing_shi_vendor__e9d215_idx","fields":["vendor_company_reference","region_code"]}],["django.db.models.Index",[],{"name":"pricing_shi_order_r_44ae8f_idx","fields":["order_reference"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## pricing.VendorCommissionAgreement

Table: `pricing_vendor_commission_agreement`. Source: [backend/apps/pricing/models.py](../../../../backend/apps/pricing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `commission_percentage` / `commission_percentage` | `DecimalField` | `NOT NULL; precision=5, scale=2; default=0` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=30; default="draft"` | `—` |
| `approved_at` / `approved_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `approved_by` / `approved_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["draft","Draft"],["pending_approval","Pending Approval"],["approved","Approved"],["rejected","Rejected"],["terminated","Terminated"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## pricing.VendorRegionalShippingFee

Table: `pricing_vendor_regional_shipping_fee`. Source: [backend/apps/pricing/models.py](../../../../backend/apps/pricing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `region_code` / `region_code` | `CharField` | `indexed; NOT NULL; length=50; default="<not set>"` | `—` |
| `fee_amount` / `fee_amount` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `currency` / `currency` | `CharField` | `NOT NULL; length=3; default="USD"` | `—` |
| `fee_type` / `fee_type` | `CharField` | `NOT NULL; length=30; default="flat"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="draft"` | `—` |
| `effective_from` / `effective_from` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `effective_to` / `effective_to` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `superseded_by` / `superseded_by_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `pricing.VendorRegionalShippingFee; PROTECT; reverse=supersedes` |
| `created_by` / `created_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `fee_type`: `[["flat","Flat Rate"],["per_unit","Per Unit"],["percentage","Percentage of Order"]]`
- `status`: `[["draft","Draft"],["active","Active"],["superseded","Superseded"],["retired","Retired"]]`

Indexes: `[["django.db.models.Index",[],{"name":"pricing_ven_vendor__905863_idx","fields":["vendor_company_reference","region_code","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## Migrations

- [backend/apps/pricing/migrations/0001_initial.py](../../../../backend/apps/pricing/migrations/0001_initial.py)
- [backend/apps/pricing/migrations/0002_vendorcommissionagreement_and_more.py](../../../../backend/apps/pricing/migrations/0002_vendorcommissionagreement_and_more.py)
- [backend/apps/pricing/migrations/0003_mapexception.py](../../../../backend/apps/pricing/migrations/0003_mapexception.py)
- [backend/apps/pricing/migrations/0004_vendorregionalshippingfee_shippingfeesnapshot_and_more.py](../../../../backend/apps/pricing/migrations/0004_vendorregionalshippingfee_shippingfeesnapshot_and_more.py)
