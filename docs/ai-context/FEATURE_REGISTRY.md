# Verified feature registry

Verified 2026-11-19 from source. IDs are permanent: do not recycle them. `implemented`
means a concrete implementation exists, not that every edge case passes or a provider
is deployed; `partial` identifies material gaps against the feature description/spec.
Test paths identify relevant coverage; actual execution is in VERIFICATION.md.
Paths in records are repository-relative. Dependencies refer to other feature IDs.
API endpoints are exact active paths with method; `{pk}` represents router lookup.
Shared components create impact across dependent features. Detailed schema/API
references and module guides supply the rest of each contract.

```yaml
feature_id: AUTH-001
feature_name: User authentication and session bootstrap
status: implemented
description: Email login, JWT refresh/logout, current-user bootstrap and browser refresh retry.
frontend_files: ["frontend/src/stores/authStore.ts", "frontend/src/lib/apiClient.ts", "frontend/src/pages/LoginPage.tsx"]
backend_files: ["backend/apps/tenant/urls/auth.py", "backend/apps/tenant/views.py"]
database_entities: ["tenant.User"]
api_endpoints: ["POST /api/v1/auth/login/", "POST /api/v1/auth/refresh/", "POST /api/v1/auth/logout/", "GET /api/v1/tenant/users/me/"]
dependencies: ["TEN-001"]
business_rules: ["BR-AUTH-001", "BR-TEN-001"]
related_tests: ["backend/tests/test_auth.py", "backend/tests/test_tenant.py"]
known_issues: ["ISSUE-005", "ISSUE-008"]
```

```yaml
feature_id: AUTH-002
feature_name: Invitations, memberships and account recovery
status: implemented
description: Company users, invitations/delegation, signed onboarding and password/email workflows.
frontend_files: ["frontend/src/pages/CompanyUsersPage.tsx", "frontend/src/pages/ConfirmEmailPage.tsx", "frontend/src/pages/ResetPasswordPage.tsx"]
backend_files: ["backend/apps/tenant/views.py", "backend/apps/tenant/services.py", "backend/apps/tenant/serializers.py"]
database_entities: ["tenant.UserInvitation", "tenant.CompanyUserMembership", "tenant.CapabilityDelegationEvidence"]
api_endpoints: ["GET /api/v1/tenant/invitations/", "GET /api/v1/tenant/memberships/"]
dependencies: ["AUTH-001", "TEN-001", "AUD-001"]
business_rules: ["BR-TEN-001", "BR-AUTH-001", "BR-AUD-001"]
related_tests: ["backend/tests/test_company_user_management.py", "backend/tests/test_user_invitation_and_email.py"]
known_issues: ["ISSUE-005"]
```

```yaml
feature_id: TEN-001
feature_name: Tenant hierarchy and capability authorization
status: implemented
description: Company/entity hierarchy, relationships, default capabilities and access checks.
frontend_files: ["frontend/src/pages/StubPages.tsx", "frontend/src/components/Sidebar.tsx"]
backend_files: ["backend/apps/tenant/models.py", "backend/apps/tenant/services.py", "backend/apps/tenant/mixins.py", "backend/apps/tenant/middleware.py"]
database_entities: ["tenant.Company", "tenant.CompanyEntity", "tenant.Capability", "tenant.CompanyRelationship", "tenant.ChildOnboardingRequest"]
api_endpoints: ["GET /api/v1/tenant/companies/", "GET /api/v1/tenant/entities/", "GET /api/v1/tenant/relationships/"]
dependencies: ["AUD-001"]
business_rules: ["BR-TEN-001", "BR-TEN-002", "BR-AUTH-001"]
related_tests: ["backend/tests/test_tenant.py", "backend/apps/tenant/test_services.py", "backend/tests/test_company_profile_client_regressions.py"]
known_issues: ["ISSUE-005"]
```

```yaml
feature_id: REG-001
feature_name: Operating regions and regional eligibility
status: implemented
description: Country-backed operating regions, distribution centers and supplier/buyer regional eligibility.
frontend_files: ["frontend/src/pages/RegionalPage.tsx", "frontend/src/pages/regional/OperatingRegionSetup.tsx"]
backend_files: ["backend/apps/tenant/regional_api.py", "backend/apps/tenant/regional_visibility.py", "backend/apps/tenant/country_regions.py"]
database_entities: ["tenant.OperatingRegion", "tenant.DistributionCenter", "tenant.RegionChangeEvent"]
api_endpoints: ["GET /api/v1/tenant/operating-regions/", "GET /api/v1/tenant/distribution-centers/"]
dependencies: ["TEN-001", "PRC-002", "AUD-001"]
business_rules: ["BR-REG-001", "BR-TEN-001"]
related_tests: ["backend/tests/test_regional_visibility_contract.py", "backend/tests/test_company_profile_client_regressions.py"]
known_issues: []
```

```yaml
feature_id: AUD-001
feature_name: Audit evidence and file tracking
status: partial
description: Audit/evidence/file models and scoped read APIs exist; creation/filter defects remain.
frontend_files: []
backend_files: ["backend/apps/audit/models.py", "backend/apps/audit/views.py", "backend/apps/audit/urls.py"]
database_entities: ["audit.AuditRecord", "audit.EvidenceRecord", "audit.EvidenceAmendmentRecord", "audit.EvidenceSupersessionRecord", "audit.FileTrackingRecord"]
api_endpoints: ["GET /api/v1/audit/records/"]
dependencies: []
business_rules: ["BR-AUD-001", "BR-TEN-001"]
related_tests: ["backend/tests/test_models_immutable.py"]
known_issues: ["ISSUE-001", "ISSUE-002"]
```

```yaml
feature_id: NTF-001
feature_name: Notification preferences, delivery and in-app messages
status: partial
description: Preference evaluator, durable requests/attempts, email/in-app delivery and reminder chains; scope and event wiring gaps remain.
frontend_files: ["frontend/src/pages/NotificationsPage.tsx"]
backend_files: ["backend/apps/notification/services.py", "backend/apps/notification/tasks.py", "backend/apps/notification/api.py"]
database_entities: ["notification.NotificationPreference", "notification.NotificationRequest", "notification.DeliveryAttempt", "notification.InAppNotification", "notification.SLAReminderChain"]
api_endpoints: ["GET /api/v1/notifications/preferences/"]
dependencies: ["TEN-001", "AUD-001"]
business_rules: ["BR-NTF-001", "BR-TEN-001"]
related_tests: ["backend/tests/test_notification_platform_phase1.py", "backend/tests/test_celery_tasks.py"]
known_issues: ["ISSUE-006", "ISSUE-007"]
```

```yaml
feature_id: MED-001
feature_name: Media upload, validation and product readiness
status: implemented
description: Presigned/direct and ZIP image workflows, matching/attachment, readiness and buyer product-image downloads.
frontend_files: ["frontend/src/pages/MediaPage.tsx", "frontend/src/pages/BuyerProductImagesPage.tsx"]
backend_files: ["backend/apps/shared_api.py", "backend/apps/media/validation.py", "backend/apps/media/readiness.py", "backend/apps/media/views.py"]
database_entities: ["media.MediaAsset", "media.UploadSession", "media.MediaAssetVersion", "media.Rendition"]
api_endpoints: ["GET /api/v1/media/assets/", "GET /api/v1/media/buyer-product-images/"]
dependencies: ["TEN-001", "CAT-001", "AUD-001"]
business_rules: ["BR-MED-001", "BR-SRC-001"]
related_tests: ["backend/tests/test_media.py", "backend/tests/test_media_validation.py", "backend/tests/test_bulk_image_scope_regressions.py", "backend/tests/test_buyer_product_images.py"]
known_issues: ["ISSUE-011"]
```

```yaml
feature_id: DEV-001
feature_name: Device reference catalog and lifecycle
status: implemented
description: Device/type/manufacturer/feature CRUD, validation/import and date-based lifecycle handling.
frontend_files: ["frontend/src/pages/DevicesPage.tsx"]
backend_files: ["backend/apps/devices/models.py", "backend/apps/devices/views.py", "backend/apps/devices/serializers.py", "backend/apps/devices/tasks.py"]
database_entities: ["devices.Device", "devices.DeviceType", "devices.Manufacturer", "devices.DeviceCapabilityEvidence", "devices.DeviceCapabilityProfile"]
api_endpoints: ["GET /api/v1/devices/devices/", "GET /api/v1/devices/types/"]
dependencies: ["TEN-001", "AUD-001"]
business_rules: ["BR-DEV-001", "BR-SRC-001"]
related_tests: ["backend/tests/test_devices.py", "backend/tests/test_device_launch_date_visibility.py", "backend/tests/test_device_lifecycle_task.py"]
known_issues: []
```

```yaml
feature_id: DEV-002
feature_name: Shared buyer device portfolios and history
status: implemented
description: Company/entity My Devices, immutable snapshots, change history and projection refresh.
frontend_files: ["frontend/src/pages/DevicesPage.tsx"]
backend_files: ["backend/apps/devices/services.py", "backend/apps/devices/views.py"]
database_entities: ["devices.BuyerDevicePortfolioReference", "devices.BuyerDevicePortfolioSnapshot", "devices.BuyerDevicePortfolioChangeRecord"]
api_endpoints: ["GET /api/v1/devices/portfolio/my_devices/", "POST /api/v1/devices/portfolio/add/", "POST /api/v1/devices/portfolio/remove/"]
dependencies: ["DEV-001", "TEN-001", "CMP-001", "AUD-001"]
business_rules: ["BR-DEV-001", "BR-TEN-001"]
related_tests: ["backend/tests/test_buyer_projection_sync.py", "backend/tests/test_compatibility_workflows.py"]
known_issues: ["ISSUE-007"]
```

```yaml
feature_id: CAT-001
feature_name: Supplier product catalog and source eligibility
status: implemented
description: Product lifecycle, manual CSV/Excel entry, supplier brands/categories and current buyer visibility gates.
frontend_files: ["frontend/src/pages/catalog/CatalogPage.tsx", "frontend/src/pages/catalog/dialogs/ProductFormDialog.tsx", "frontend/src/pages/catalog/hooks/useProductForm.ts"]
backend_files: ["backend/apps/catalog/models.py", "backend/apps/catalog/api.py", "backend/apps/catalog/source_visibility.py"]
database_entities: ["catalog.Product", "catalog.Brand", "catalog.VendorBrandRelationship", "catalog.VendorCategoryMapping"]
api_endpoints: ["GET /api/v1/catalog/products/", "POST /api/v1/catalog/products/"]
dependencies: ["TEN-001", "CMP-001", "CMP-002", "MED-001", "REG-001", "PRC-001"]
business_rules: ["BR-SRC-001", "BR-CAT-001", "BR-MED-001"]
related_tests: ["backend/tests/test_catalog.py", "backend/tests/test_supplier_brand_entry.py", "backend/tests/test_vendor_manual_import_regressions.py"]
known_issues: ["ISSUE-012"]
```

```yaml
feature_id: CAT-002
feature_name: Vendor product audit and manual review
status: implemented
description: Admin source/system comparison, filtered paginated diagnostics, audited single/bulk device mapping and explicit review resolution; phase 3 UI pending.
frontend_files: []
backend_files: ["backend/apps/catalog/api.py", "backend/apps/catalog/vendor_audit.py", "backend/apps/integration/catalog_notifications.py"]
database_entities: ["catalog.Product", "catalog.ProductCompatibilityAssertion", "integration.VendorCatalogItem", "notification.InAppNotification", "audit.AuditRecord"]
api_endpoints: ["GET /api/v1/catalog/products/vendor-audit/", "GET /api/v1/catalog/products/vendor-audit-stats/", "POST /api/v1/catalog/products/{pk}/map-devices/", "POST /api/v1/catalog/products/{pk}/resolve-review/", "POST /api/v1/catalog/products/bulk-map-devices/", "POST /api/v1/catalog/products/bulk-resolve-review/"]
dependencies: ["CAT-001", "CMP-001", "INT-002", "NTF-001", "AUD-001", "AUTH-001"]
business_rules: ["BR-CAT-002", "BR-TEN-001", "BR-AUD-001", "BR-SRC-001"]
related_tests: ["backend/tests/test_vendor_audit_api.py"]
known_issues: ["ISSUE-013"]
```

```yaml
feature_id: CMP-001
feature_name: Canonical compatibility matching and buyer projections
status: implemented
description: Rule-based and explicit compatibility evidence, universal type scopes, exclusions, projection fan-out and lazy repair.
frontend_files: ["frontend/src/pages/catalog/CompatibilityTab.tsx", "frontend/src/components/CompatibilityFields.tsx"]
backend_files: ["backend/apps/catalog/compatibility_engine.py", "backend/apps/catalog/compatibility_contract.py", "backend/apps/catalog/compatibility_commands.py", "backend/apps/catalog/services.py"]
database_entities: ["catalog.ProductCompatibilityAssertion", "catalog.ProductUniversalDeviceTypeScope", "catalog.BuyerScopedCompatibilityProjection"]
api_endpoints: ["GET /api/v1/catalog/products/"]
dependencies: ["DEV-001", "DEV-002", "CMP-002", "CAT-001", "REG-001"]
business_rules: ["BR-CMP-001", "BR-DEV-001", "BR-SRC-001"]
related_tests: ["backend/tests/test_compatibility_contract.py", "backend/tests/test_compatibility_feature_matrix.py", "backend/tests/test_approved_speaker_scope.py", "backend/tests/test_buyer_projection_sync.py"]
known_issues: ["ISSUE-007", "ISSUE-012"]
```

```yaml
feature_id: CMP-002
feature_name: Governed compatibility options and import parity
status: implemented
description: Admin category/value configuration, normalized field values and shared manual/API/CSV compatibility validation.
frontend_files: ["frontend/src/components/CompatibilityValuesManager.tsx", "frontend/src/pages/catalog/compatibilityEntry.ts", "frontend/src/hooks/useCompatibilityOptions.ts"]
backend_files: ["backend/apps/catalog/compatibility_configuration.py", "backend/apps/catalog/compatibility_values.py", "backend/apps/catalog/compatibility_import.py", "backend/apps/catalog/compatibility_rebuild.py"]
database_entities: ["catalog.DynamicDropdownConfig", "devices.DeviceType"]
api_endpoints: ["GET /api/v1/catalog/dropdown-configs/"]
dependencies: ["TEN-001", "AUD-001", "DEV-001"]
business_rules: ["BR-CMP-001", "BR-AUD-001"]
related_tests: ["backend/tests/test_compatibility_api_contract.py", "backend/tests/test_compatibility_failure_paths.py", "backend/tests/test_universal_rebuild_deployment.py", "backend/tests/test_wireless_matrix_client_contract.py"]
known_issues: []
```

```yaml
feature_id: EXP-001
feature_name: Frozen buyer catalog export and export history
status: implemented
description: Scoped export jobs, frozen selection/history, JSON/CSV outputs and download tracking.
frontend_files: ["frontend/src/pages/catalog/ExportJobsTab.tsx", "frontend/src/pages/catalog/dialogs/ExportDialog.tsx"]
backend_files: ["backend/apps/catalog/api.py", "backend/apps/catalog/tasks.py"]
database_entities: ["catalog.BuyerProductExportJob", "catalog.BuyerProductExportSelectionSnapshot", "catalog.BuyerProductExportDate"]
api_endpoints: ["POST /api/v1/catalog/export-jobs/create_job/", "GET /api/v1/catalog/export-jobs/list_jobs/", "GET /api/v1/catalog/export-jobs/{pk}/download/"]
dependencies: ["CAT-001", "MED-001", "PRC-001", "REG-001", "EXP-002"]
business_rules: ["BR-EXP-001", "BR-CAT-001", "BR-MED-001"]
related_tests: ["backend/tests/test_buyer_export_history.py", "backend/tests/test_vendor_export_validation.py", "backend/tests/test_buyer_b2b_api.py"]
known_issues: []
```

```yaml
feature_id: EXP-002
feature_name: Storefront supplier selection mapping
status: implemented
description: Versioned frozen buyer offer selections, external listing binding and supplier-resolution evidence.
frontend_files: ["frontend/src/pages/catalog/dialogs/ExportDialog.tsx", "frontend/src/pages/IntegrationPage.tsx"]
backend_files: ["backend/apps/catalog/offer_models.py", "backend/apps/catalog/offer_services.py", "backend/apps/catalog/offer_api.py", "backend/apps/integration/storefront_api.py"]
database_entities: ["catalog.BuyerExportMapping", "integration.BuyerStorefront"]
api_endpoints: ["GET /api/v1/integration/buyer-export-mappings/", "POST /api/v1/integration/buyer-export-mappings/{pk}/bind_listing/", "GET /api/v1/integration/buyer-storefronts/"]
dependencies: ["TEN-001", "PRC-001", "AUD-001"]
business_rules: ["BR-EXP-001", "BR-TEN-001"]
related_tests: ["backend/tests/test_supplier_export_mapping.py", "backend/tests/test_supplier_order_acceptance.py"]
known_issues: []
```

```yaml
feature_id: PRC-001
feature_name: Buyer/vendor commission and pricing snapshots
status: implemented
description: Buyer-facing prices, vendor agreements and immutable effective price/bindability evidence.
frontend_files: ["frontend/src/pages/PricingPage.tsx"]
backend_files: ["backend/apps/pricing/models.py", "backend/apps/pricing/services.py", "backend/apps/pricing/api.py"]
database_entities: ["pricing.PricingProfile", "pricing.EffectivePriceSnapshot", "pricing.VendorCommissionAgreement", "pricing.POPricingBindability"]
api_endpoints: ["GET /api/v1/pricing/buyer-prices/"]
dependencies: ["TEN-001", "CAT-001", "PRC-002"]
business_rules: ["BR-PRC-001", "BR-PRC-002"]
related_tests: ["backend/tests/test_buyer_facing_pricing.py", "backend/tests/test_models_immutable.py"]
known_issues: []
```

```yaml
feature_id: PRC-002
feature_name: MAP exceptions and regional shipping snapshots
status: implemented
description: Approved MAP exceptions, effective regional vendor shipping fees and frozen fee evidence.
frontend_files: ["frontend/src/pages/PricingPage.tsx", "frontend/src/pages/regional/ShippingFeeDialog.tsx"]
backend_files: ["backend/apps/pricing/services.py", "backend/apps/pricing/api.py", "backend/apps/pricing/models.py"]
database_entities: ["pricing.MapException", "pricing.VendorRegionalShippingFee", "pricing.ShippingFeeSnapshot"]
api_endpoints: ["GET /api/v1/pricing/shipping-fees/"]
dependencies: ["TEN-001"]
business_rules: ["BR-PRC-002", "BR-REG-001"]
related_tests: ["backend/tests/test_map_enforcement.py", "backend/tests/test_regional_visibility_contract.py"]
known_issues: []
```

```yaml
feature_id: ORD-001
feature_name: Buyer order acceptance and supplier split
status: implemented
description: Buyer-scoped acceptance, exported offer resolution, immutable accepted lines and routed suborders.
frontend_files: ["frontend/src/pages/OrdersPage.tsx", "frontend/src/pages/TelcoCellularPage.tsx"]
backend_files: ["backend/apps/routing/api.py", "backend/apps/routing/models.py", "backend/apps/catalog/offer_services.py"]
database_entities: ["routing.Order", "routing.AcceptedOrderLine", "routing.RoutedSuborder"]
api_endpoints: ["GET /api/v1/routing/orders/", "POST /api/v1/routing/orders/"]
dependencies: ["EXP-002", "PRC-001", "TEN-001", "AUD-001", "INT-003"]
business_rules: ["BR-EXP-001", "BR-PRC-001", "BR-TEN-001"]
related_tests: ["backend/tests/test_supplier_order_acceptance.py", "backend/tests/test_buyer_b2b_api.py"]
known_issues: ["ISSUE-012"]
```

```yaml
feature_id: ORD-002
feature_name: Vendor manual export and delivery evidence
status: implemented
description: Schedules/windows/batches, manual CSV export/re-export and delivery evidence handling.
frontend_files: ["frontend/src/pages/OrdersPage.tsx"]
backend_files: ["backend/apps/routing/api.py", "backend/apps/routing/services.py", "backend/apps/routing/tasks.py"]
database_entities: ["routing.VendorExportSchedule", "routing.VendorExportWindow", "routing.VendorExportDeliveryEvidence", "routing.VendorOrderExportLog"]
api_endpoints: ["GET /api/v1/routing/export-schedules/", "GET /api/v1/routing/export-windows/", "GET /api/v1/routing/export-logs/"]
dependencies: ["ORD-001", "NTF-001", "AUD-001"]
business_rules: ["BR-AUD-001", "BR-TEN-001"]
related_tests: ["backend/tests/test_manual_vendor_export.py", "backend/tests/test_vendor_export_validation.py"]
known_issues: ["ISSUE-003"]
```

```yaml
feature_id: PRO-001
feature_name: Purchase orders and legacy finalization
status: partial
description: Nested PO/line create and approval exist; finalization has synthetic evidence and transaction/type defects.
frontend_files: ["frontend/src/pages/ProcurementPage.tsx"]
backend_files: ["backend/apps/shared_api.py", "backend/apps/procurement/models.py", "backend/apps/procurement/services.py"]
database_entities: ["procurement.PurchaseOrder", "procurement.PurchaseOrderLine"]
api_endpoints: ["GET /api/v1/procurement/purchase-orders/", "POST /api/v1/procurement/purchase-orders/", "POST /api/v1/procurement/purchase-orders/{pk}/approve/"]
dependencies: ["PRC-001", "ORD-001", "ORD-002", "FUL-001"]
business_rules: ["BR-PRO-001", "BR-PRC-001"]
related_tests: ["backend/tests/test_procurement_nested.py", "backend/tests/test_po_orchestration.py"]
known_issues: ["ISSUE-003", "ISSUE-009"]
```

```yaml
feature_id: FUL-001
feature_name: Fulfillment, shipping, tracking and SLA
status: implemented
description: Vendor handoffs/imports, buyer shipment view, carrier observations, delivery evidence and SLA signals.
frontend_files: ["frontend/src/pages/FulfillmentPage.tsx"]
backend_files: ["backend/apps/fulfillment/api.py", "backend/apps/fulfillment/tasks.py", "backend/apps/fulfillment/carrier_tracking.py"]
database_entities: ["fulfillment.FulfillmentHandoff", "fulfillment.DeliveryDateEvidence", "fulfillment.SLAEvaluationRecord", "fulfillment.BuyerUpdateReadySignal", "fulfillment.VendorShippingImportLog"]
api_endpoints: ["GET /api/v1/fulfillment/handoffs/", "GET /api/v1/fulfillment/buyer-shipments/"]
dependencies: ["ORD-001", "ORD-002", "TEN-001", "NTF-001", "AUD-001"]
business_rules: ["BR-TEN-001", "BR-AUD-001"]
related_tests: ["backend/tests/test_fulfillment_shipping.py", "backend/tests/test_shipping_import.py", "backend/tests/test_buyer_shipping_import.py", "backend/tests/test_webhook_and_shipment.py"]
known_issues: ["ISSUE-003"]
```

```yaml
feature_id: RET-001
feature_name: Return requests and vendor return imports
status: implemented
description: Buyer return request/RAN lifecycle and vendor return confirmation/import records.
frontend_files: ["frontend/src/pages/FulfillmentPage.tsx"]
backend_files: ["backend/apps/fulfillment/api.py", "backend/apps/fulfillment/models.py"]
database_entities: ["fulfillment.ReturnRequest", "fulfillment.VendorReturnImportLog", "pricing.ReturnAdjustmentPricingEvidence"]
api_endpoints: ["GET /api/v1/fulfillment/return-requests/", "POST /api/v1/fulfillment/return-requests/"]
dependencies: ["FUL-001", "PRC-001", "AUD-001"]
business_rules: ["BR-PRC-001", "BR-TEN-001", "BR-AUD-001"]
related_tests: ["backend/tests/test_returns_request_creation.py", "backend/tests/test_returns_import.py"]
known_issues: []
```

```yaml
feature_id: INV-001
feature_name: Invoice generation, transitions and reconciliation records
status: implemented
description: Runs/periods, manual/from-order invoices, adjustments, exceptions and match records; no claim of complete payment settlement.
frontend_files: ["frontend/src/pages/InvoicingPage.tsx"]
backend_files: ["backend/apps/invoicing/api.py", "backend/apps/invoicing/models.py"]
database_entities: ["invoicing.InvoiceRun", "invoicing.InvoicePeriod", "invoicing.Invoice", "invoicing.InvoiceLine", "invoicing.InvoiceAdjustment", "invoicing.VendorReconciliationMatchResult"]
api_endpoints: ["GET /api/v1/invoicing/invoices/", "POST /api/v1/invoicing/invoices/create-from-orders/"]
dependencies: ["PRO-001", "FUL-001", "RET-001", "PRC-001", "AUD-001"]
business_rules: ["BR-INV-001", "BR-PRC-001"]
related_tests: ["backend/tests/test_invoice_auto_generation.py", "backend/tests/test_models_immutable.py"]
known_issues: []
```

```yaml
feature_id: INT-001
feature_name: Company API keys and generic integration administration
status: implemented
description: Company-scoped B2B API-key authentication, entity selection and generic connection/action/webhook administration.
frontend_files: ["frontend/src/pages/IntegrationPage.tsx"]
backend_files: ["backend/apps/integration/authentication.py", "backend/apps/integration/models.py", "backend/apps/shared_api.py"]
database_entities: ["integration.CompanyAPIKey", "integration.ExternalConnection", "integration.ExternalActionRequest", "integration.WebhookDelivery"]
api_endpoints: ["GET /api/v1/integration/api-keys/", "GET /api/v1/integration/connections/"]
dependencies: ["TEN-001", "AUTH-001", "AUD-001"]
business_rules: ["BR-TEN-001", "BR-AUTH-001"]
related_tests: ["backend/tests/test_api_keys.py", "backend/tests/test_buyer_b2b_api.py", "backend/tests/test_api_schema.py"]
known_issues: ["ISSUE-007", "ISSUE-008", "ISSUE-009"]
```

```yaml
feature_id: INT-002
feature_name: Durable vendor catalog synchronization
status: implemented
description: Admin-configured vendor adapters, audited draft activation and distributor-brand onboarding, encrypted credentials, budgeted page sync and canonical product/media ingestion.
frontend_files: ["frontend/src/pages/VendorCatalogPage.tsx", "frontend/src/components/VendorCatalogConsole.tsx", "frontend/src/components/VendorCatalogConfigEditor.tsx"]
backend_files: ["backend/apps/integration/catalog_api.py", "backend/apps/integration/catalog_sync.py", "backend/apps/integration/catalog_import.py", "backend/apps/integration/catalog_transport.py", "backend/apps/integration/catalog_secrets.py", "backend/apps/integration/catalog_media.py"]
database_entities: ["integration.VendorCatalogConnection", "integration.VendorCatalogSyncRun", "integration.VendorCatalogItem", "integration.VendorCatalogBudget"]
api_endpoints: ["GET /api/v1/integration/vendor-catalog-connections/", "POST /api/v1/integration/vendor-catalog-connections/{pk}/sync/"]
dependencies: ["CAT-001", "CMP-002", "MED-001", "TEN-001", "AUD-001"]
business_rules: ["BR-INT-001", "BR-INT-002", "BR-SRC-001", "BR-MED-001"]
related_tests: ["backend/tests/test_vendor_catalog_sync.py", "backend/tests/test_vendor_catalog_media.py", "backend/tests/test_vendor_manual_import_regressions.py", "backend/tests/test_vendor_import_phase1.py"]
known_issues: ["ISSUE-011"]
```

```yaml
feature_id: INT-003
feature_name: Supplier order dispatch and shipment polling
status: implemented
description: Validated commerce profiles, durable supplier dispatch/retry and incremental shipment polling into fulfillment.
frontend_files: ["frontend/src/pages/IntegrationPage.tsx"]
backend_files: ["backend/apps/integration/commerce_api.py", "backend/apps/integration/order_dispatch.py", "backend/apps/integration/shipment_poll.py", "backend/apps/integration/tasks.py"]
database_entities: ["integration.VendorCommerceProfile", "integration.SupplierOrderDispatch", "integration.VendorCommercePollRun"]
api_endpoints: ["GET /api/v1/integration/vendor-commerce-profiles/", "POST /api/v1/integration/vendor-commerce-profiles/{pk}/poll_now/", "GET /api/v1/integration/operations/dispatches/"]
dependencies: ["INT-002", "ORD-001", "FUL-001", "AUD-001"]
business_rules: ["BR-INT-001", "BR-EXP-001"]
related_tests: ["backend/tests/test_cixci_admin_commerce.py", "backend/tests/test_vendor_operations.py", "backend/tests/test_supplier_order_acceptance.py"]
known_issues: ["ISSUE-011"]
```

```yaml
feature_id: INT-004
feature_name: Signed commerce webhooks and finance/return synchronization
status: implemented
description: Signed inbound receipts with dedup, routed updates, encrypted/signed outbound delivery retries and provider finance/return records.
frontend_files: ["frontend/src/pages/IntegrationPage.tsx"]
backend_files: ["backend/apps/integration/webhook_receiver.py", "backend/apps/integration/webhook_handlers.py", "backend/apps/integration/webhook_dispatch.py", "backend/apps/integration/finance_sync.py"]
database_entities: ["integration.VendorWebhookReceipt", "integration.VendorOutboundDelivery", "integration.VendorFinanceRecord", "integration.VendorReturnRecord"]
api_endpoints: ["POST /api/v1/integration/webhooks/{receiver_id}/", "POST /api/v1/integration/vendor-commerce-profiles/{pk}/sync-finance/"]
dependencies: ["INT-003", "FUL-001", "RET-001", "AUD-001"]
business_rules: ["BR-WHK-001", "BR-INT-001", "BR-TEN-001"]
related_tests: ["backend/tests/test_webhook_and_shipment.py", "backend/tests/test_outbound_webhook.py", "backend/tests/test_balaji_integration.py"]
known_issues: ["ISSUE-010"]
```

```yaml
feature_id: ANA-001
feature_name: Reporting metrics, summary aggregation and freshness
status: partial
description: Metric/freshness APIs and summary-window aggregation exist; tenant audience/isolation and complete event delivery need review.
frontend_files: ["frontend/src/pages/AnalyticsPage.tsx", "frontend/src/pages/DashboardPage.tsx"]
backend_files: ["backend/apps/analytics/models.py", "backend/apps/analytics/tasks.py", "backend/apps/shared_api.py"]
database_entities: ["analytics.ReportingMetric", "analytics.ActivitySummaryReportingWindow", "analytics.ActivitySummaryAggregationRecord", "analytics.DataFreshnessMarker"]
api_endpoints: ["GET /api/v1/analytics/metrics/", "GET /api/v1/analytics/summary-windows/", "GET /api/v1/analytics/freshness-markers/"]
dependencies: ["ORD-001", "FUL-001", "NTF-001", "TEN-001"]
business_rules: ["BR-TEN-001", "BR-SRC-001"]
related_tests: ["backend/tests/test_celery_tasks.py", "backend/tests/test_models_immutable.py"]
known_issues: ["ISSUE-004", "ISSUE-007"]
```

```yaml
feature_id: LCH-001
feature_name: Launch coordination records
status: partial
description: LaunchEvent CRUD and UI with source-readiness references; full readiness/approval orchestration is unverified.
frontend_files: ["frontend/src/pages/LaunchPage.tsx"]
backend_files: ["backend/apps/launch/models.py", "backend/apps/shared_api.py"]
database_entities: ["launch.LaunchEvent"]
api_endpoints: ["GET /api/v1/launch/events/", "POST /api/v1/launch/events/"]
dependencies: ["TEN-001", "CAT-001", "DEV-001", "PRC-001", "NTF-001"]
business_rules: ["BR-SRC-001", "BR-TEN-001"]
related_tests: []
known_issues: ["ISSUE-004", "ISSUE-007"]
```

```yaml
feature_id: UI-001
feature_name: SPA shell, navigation and API state
status: implemented
description: Theme/query/feedback providers, protected routes, sidebar, shared API client and page consumers.
frontend_files: ["frontend/src/main.tsx", "frontend/src/App.tsx", "frontend/src/components/AppLayout.tsx", "frontend/src/components/Sidebar.tsx", "frontend/src/lib/apiClient.ts"]
backend_files: ["backend/config/urls.py"]
database_entities: []
api_endpoints: ["GET /api/v1/tenant/users/me/"]
dependencies: ["AUTH-001", "TEN-001"]
business_rules: ["BR-AUTH-001"]
related_tests: ["scripts/csv-preview.test.mjs", "scripts/verify-compatibility-ui.mjs", "scripts/verify-client-release.ps1"]
known_issues: ["ISSUE-008"]
```

```yaml
feature_id: MEM-001
feature_name: Persistent repository agent memory
status: implemented
description: Canonical workflow, recovery checkpoints, source-backed module/feature/rule/API/schema navigation and validation tooling.
frontend_files: []
backend_files: []
database_entities: []
api_endpoints: []
dependencies: []
business_rules: []
related_tests: ["scripts/ai-context.test.mjs", "scripts/validate-ai-context.mjs"]
known_issues: []
```
