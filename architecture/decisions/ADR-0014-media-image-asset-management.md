# ADR-0014: Media / Image Asset Management

## Status

Proposed

## Context

CIXCI needs centralized media and image management for accessory products, device records, category-extensible branded products, buyer exports, API delivery, marketing downloads, and future AI image-quality review signals.

Accessory vendors may upload product images through:

- CSV/API image references.
- Manual image upload.
- ZIP file upload containing multiple images.

Buyers need access to downstream-ready image assets for:

- Product display.
- API exports.
- Website usage.
- Marketing and merchandising downloads.

CIXCI currently uses an AWS account to store vendor accessory images. The architecture should support AWS/S3-style centralized object storage as the expected storage pattern while keeping the storage provider configurable for the future.

This ADR is proposal-level. It does not finalize storage implementation, object path naming, provider selection, image processing tooling, transformation quality thresholds, access implementation, licensing workflow, CDN behavior, or implementation behavior.

## Decision

Introduce Media / Image Asset Management as a distinct platform service / bounded context.

Media / Image Asset Management owns centralized media storage references, asset upload intake, ZIP processing, validation, transformation, renditions, downloadable marketing-ready assets, API-ready URL references, processing status, access controls, storage path organization, metadata, and media processing events.

Media / Image Asset Management must not become the source of truth for product records, device records, pricing, routing, fulfillment, invoice lifecycle, legal licensing workflow, notification delivery, or analytics definitions.

### Media / Image Asset Management Owns

- Image/media storage references.
- Centralized asset storage.
- Asset upload intake.
- ZIP upload processing.
- Image extraction from ZIP files.
- Image validation.
- Image transformation.
- Format normalization.
- JPEG-to-PNG conversion where supported.
- Transparent-background PNG generation where supported.
- Asset versions.
- Asset renditions.
- Downloadable marketing-ready PNG assets.
- API-ready image URL references.
- Asset metadata.
- Asset processing status.
- Asset access controls.
- Storage path organization.
- Media processing events.

### Media / Image Asset Management Does Not Own

- Product Catalog product records.
- Device Catalog canonical device records.
- Marketing content decisions.
- Buyer-side graphic design.
- Buyer storefront design.
- Product compatibility.
- Pricing.
- Order routing.
- Fulfillment.
- Invoice lifecycle.
- Legal licensing workflow unless a future Licensing context assigns it.
- Notification delivery.
- Analytics definitions.

## Ownership Boundaries

Product Catalog owns product records and references media assets attached to products.

Device Catalog owns device records and references device media assets.

Media / Image Asset Management owns storage, transformation, rendition, file validation, storage references, delivery references, and asset metadata.

Buyers may access approved/downloadable assets but cannot alter vendor-owned source assets.

Vendors may upload and manage their own assets but cannot access or alter other vendors' assets.

Device manufacturers may upload and manage their own device assets but cannot access or alter other manufacturers' assets.

CIXCI/System Admin may review, approve, reject, or manage assets based on permissions.

Buyer-facing modules may use image URLs/downloads but do not own the source media.

## Current Storage Direction / AWS Object Storage

CIXCI currently uses AWS to store vendor accessory images.

Media / Image Asset Management should support AWS/S3-style centralized object storage as the expected storage pattern. The architecture should keep storage provider implementation configurable and should not permanently hard-code AWS as a business rule.

Storage paths/folders should be created during vendor and device manufacturer onboarding where appropriate.

Vendor folders should be based on a stable vendor identifier and normalized vendor name.

Device manufacturer folders should be based on a stable manufacturer identifier and normalized manufacturer name.

Product image folders should be organized by SKU where applicable.

Device image folders should be organized by Device Reference, device SKU, or manufacturer-provided device identifier where applicable.

Proposal-level path examples:

- `vendors/{vendor-id}-{normalized-vendor-name}/accessories/{sku}/`
- `manufacturers/{manufacturer-id}-{normalized-manufacturer-name}/devices/{device-reference-or-sku}/`
- `vendors/{vendor-id}-{normalized-vendor-name}/branded-products/{sku}/`

Each SKU/device folder may contain:

- Original source images.
- Validated images.
- Converted PNG renditions.
- Thumbnails.
- Marketing-ready assets.
- API-ready URL renditions.
- Rejected/failed-processing references where permitted.

Guardrails:

- Folder/path naming should use stable system IDs where possible instead of display names alone.
- Company names, manufacturer names, product names, and SKUs may change or contain unsupported characters.
- Storage paths are implementation references, not business identifiers.
- Product Catalog and Device Catalog should reference Media Asset IDs, not raw storage folder paths.
- Media Asset ID remains the durable platform reference.
- Storage path changes should not break Product Catalog or Device Catalog references.

## Vendor And Manufacturer Onboarding Folder Creation

Proposal-level workflow:

- When a new vendor is onboarded, the system may create or reserve a vendor media storage path/folder.
- When a new device manufacturer is onboarded, the system may create or reserve a manufacturer media storage path/folder.
- Folder creation should be idempotent.
- Folder creation should be auditable.
- Folder creation failure should not silently block onboarding without review.
- Folder naming should be normalized and collision-safe.
- If a vendor or manufacturer name changes, existing storage paths should remain stable or be redirected through metadata rather than treated as the source of truth.

## Product / SKU Folder Organization

When vendors upload images for accessories or branded products, the system should support SKU-based folder organization.

Each SKU should have a dedicated image folder where feasible.

Images uploaded through ZIP, manual upload, API reference, or future import method should be linked to the correct SKU folder when mapping is available.

If SKU mapping is missing or ambiguous, files should be routed to a review/unmapped area or flagged for correction.

SKU folders should support multiple images per SKU.

Image order/primary image assignment should be stored as metadata, not inferred only from folder ordering.

Product Catalog owns the relationship between product and media references. Media service owns storage organization and asset metadata.

## Vendor ZIP Upload Workflow

Proposal-level workflow:

- Vendor uploads ZIP file containing product images.
- System accepts ZIP as an asset processing job.
- System unzips/extracts files.
- System validates file type, file size, dimensions, naming convention, duplicates, and supported formats.
- System maps images to products where possible by SKU, filename convention, metadata, or upload mapping.
- System places/moves accepted files into the correct vendor/product/SKU media storage path where applicable.
- Invalid images are rejected or flagged for correction.
- Ambiguous or unmapped images are routed to review.
- Valid images are stored in centralized media storage.
- Processing results are logged and auditable.
- Product Catalog receives media asset references, not raw file ownership.

## Image Validation And Transformation Workflow

The system should validate image format and size.

Supported source formats may include JPEG/JPG, PNG, and future formats.

JPEG images may be converted into PNG format where supported.

PNG renditions may support transparent backgrounds where processing is available and quality rules are met.

Original source file may be preserved as source asset where permitted.

Transformed versions are stored as asset renditions.

Failed transformations produce processing errors and review queues.

The system must not silently degrade image quality without recording processing results.

Converted assets must preserve source asset lineage.

## JPEG / PNG / URL Handling

PNG assets should be available for buyer download where marketing-ready assets are required.

Image URLs should be generated and stored for API/export delivery to buyers.

URLs may reference approved platform-hosted asset renditions.

JPEG source files or converted renditions may produce URL references for buyer API delivery.

Product export/API responses may include image URL fields where Product Catalog references approved assets.

Buyer downloads may include PNG renditions where available.

Product Catalog remains owner of which media asset is attached to which product.

Media service supplies URL references and downloadable rendition references.

## Transformation Guardrails

Proposal-level guardrails:

- Minimum/maximum image dimensions.
- File size limits.
- Supported source formats.
- Supported target formats.
- Transparent background validation placeholder.
- Image quality threshold placeholder.
- Naming convention requirements.
- SKU mapping requirements.
- Duplicate detection.
- Malware/security scanning placeholder.
- Fallback behavior when conversion fails.
- Rejection behavior when validation fails.
- Manual review behavior when automated transformation is uncertain.
- Preservation of original source file where permitted.

## Centralized Storage

All approved assets should be stored in centralized platform-managed media storage.

The current expected pattern is AWS/S3-style object storage. Storage implementation remains configurable.

Source assets, derived renditions, thumbnails, marketing PNGs, and API URL renditions may be stored separately.

Assets should have stable references and versioning.

Storage should support controlled access, expiry/signed URL placeholders, CDN future placeholder, and caching future placeholder.

Storage path should be metadata, not source of truth.

Media Asset ID should be the primary internal identifier.

## API And Export Integration

Product Catalog and Device Catalog can reference approved Media Asset IDs.

Buyer export/API responses can include image URLs.

Buyers can download approved PNG assets where available.

Export schemas may include image URL fields and/or downloadable asset references.

Media service supplies delivery references, not product ownership.

Product Catalog decides which product media references are included in product export.

Media service can support buyer-accessible download packages or ZIP downloads as a future placeholder.

## Privacy, Access, And Tenancy

Tenant isolation is required.

Vendor assets are scoped to the owning vendor.

Manufacturer assets are scoped to the owning manufacturer.

Buyer access is limited to approved assets they are eligible to view/export.

System admin access is controlled by role.

There must be no cross-vendor asset leakage, no cross-manufacturer asset leakage, and no cross-buyer unauthorized downloads.

Image URLs must respect access rules where applicable.

Asset access/download events should be auditable.

Signed or expiring URLs may be required for protected assets.

## Rights And Licensing Boundaries

Media service may store rights/licensing metadata placeholders, usage constraints, and approval status.

Media service does not own full legal licensing workflow unless future Licensing Management is introduced.

Licensed-team/league images may require additional approval status.

Product Catalog may reference licensed property metadata, while Media service tracks asset rights metadata where applicable.

Branded merchandise and licensed products may require stricter media approval rules.

## Logs & Audit Relationship

Media processing jobs, ZIP upload events, validation results, transformation results, asset downloads, URL generation, storage-path assignment, and failed processing attempts should be auditable.

Logs & Audit owns audit records and file processing evidence.

Media service owns media processing state and asset metadata.

Logs & Audit should receive references, status, hashes, row/file counts where applicable, and processing summaries.

## AI Agent Services Signals

Possible AI Agent Services signals:

- Missing image signal.
- Low-quality image signal.
- Duplicate image signal.
- Image format issue signal.
- Transparent background issue signal.
- Asset readiness signal.
- Media rights review signal.
- Product image coverage gap signal.
- SKU image mapping failure signal.
- Failed transformation signal.

AI agents may recommend improvements, review queues, or asset corrections but must not silently replace source assets, alter rights metadata, change Product Catalog media attachments, or publish buyer-facing media without approval.

## Notification Hooks

Media service may emit events that later trigger notifications.

Notification Platform Service owns delivery.

Possible notification triggers include:

- ZIP processing failed.
- Image validation failed.
- Asset review required.
- Media approved.
- Media rejected.
- SKU mapping failed.
- Transformation failed.

## Scalability And Future Delivery

Proposal-level scalability concepts:

- Async media processing jobs.
- Processing queues.
- Batch ZIP processing.
- Image conversion workers.
- CDN future placeholder.
- Caching future placeholder.
- Signed URL / expiring URL placeholder.
- Thumbnail generation.
- Rendition lifecycle.
- Storage quotas.
- File size limits.
- Retry handling.
- Duplicate-detection cost controls.
- Upload concurrency limits.
- Large ZIP handling.
- Storage lifecycle policies.

## Events

Proposal-level events:

- `media.upload.received`.
- `media.zip.extraction.completed`.
- `media.validation.completed`.
- `media.validation.failed`.
- `media.transformation.started`.
- `media.transformation.completed`.
- `media.transformation.failed`.
- `media.asset.approved`.
- `media.asset.rejected`.
- `media.asset.version.created`.
- `media.asset.downloaded`.
- `media.asset.url.generated`.
- `media.asset.review.required`.
- `media.storage.path.created`.
- `media.sku.mapping.failed`.
- `media.asset.mapped.to.product`.
- `media.asset.mapped.to.device`.

Event payloads should use references and redaction/access classes. Events should not expose raw storage paths, signed URLs, licensing-sensitive data, or buyer-ineligible media data unless explicitly allowed.

## Open Questions

- Should original source files always be preserved?
- Which formats are supported at launch?
- Are transparent-background PNGs required for all product images or only marketing assets?
- What exact image dimension and file size rules apply by product type/category?
- Should JPEG-to-PNG conversion be automatic or approval-required?
- What naming convention maps images to product SKUs?
- Should buyer image downloads be ZIP packages?
- Should URLs be public, signed, expiring, or tenant-authenticated?
- Who approves media assets before buyer visibility?
- What rights/licensing metadata is required for branded merchandise and licensed products?
- How should duplicate assets be detected across vendors without leaking data?
- What retention rules apply to rejected images and failed transformations?
- What media events should trigger notifications?
- Should media storage paths use display names, stable system IDs, or both?
- What folder/path naming convention should be used for vendors, manufacturers, SKUs, source files, converted files, thumbnails, rejected files, and API-ready renditions?
- What happens if vendor/manufacturer onboarding succeeds but media folder creation fails?
- How should storage paths be handled if a vendor, manufacturer, or SKU changes?
- Should Product Catalog and Device Catalog ever store raw URL/path values, or only Media Asset IDs?
- How are URL expirations handled for buyer exports and downstream storefronts?

## Impacts

Future Media / Image Asset Management module drafting should define:

- Media Asset ID and asset version model.
- Asset upload intake model.
- ZIP processing and extraction model.
- Validation and transformation model.
- Rendition model.
- Storage reference and path metadata model.
- Access/download authorization model.
- Buyer export/API image URL model.
- Logs & Audit integration.
- AI Agent Services signal contracts.
- Notification hooks.
- Storage provider configuration and AWS/S3-style storage expectations.

Future Product Catalog and Device Catalog refinements should reference Media Asset IDs instead of treating raw storage paths or URLs as durable media identity.

## Consequences

- Media / Image Asset Management becomes the canonical platform service for media storage references, transformation, renditions, validation, asset metadata, and delivery references.
- Product Catalog and Device Catalog remain owners of product/device records and media attachment relationships.
- AWS/S3-style object storage is recognized as the expected current pattern without hard-coding AWS as a permanent business rule.
- Vendors, manufacturers, buyers, and admins receive clearer asset access boundaries.
- Future media module work can support ZIP uploads, SKU folder organization, PNG conversions, transparent-background renditions, image URLs, marketing downloads, auditability, AI image-quality signals, and notification hooks without moving catalog/device ownership into Media.
