# Media and product images

Purpose: controlled upload, image validation/attachment, product media readiness,
renditions and scoped buyer image downloads. Feature MED-001.

## Entry points and files

Active MediaAssetViewSet/UploadSessionViewSet/BuyerProductImagesViewSet are in
[shared_api.py](../../../backend/apps/shared_api.py), not the empty media router.
[models](../../../backend/apps/media/models.py), [validation](../../../backend/apps/media/validation.py),
[readiness](../../../backend/apps/media/readiness.py), [matching](../../../backend/apps/media/matching.py),
[services](../../../backend/apps/media/services.py),
[proxy](../../../backend/apps/media/views.py), [short URLs](../../../backend/apps/media/utils.py).
Frontend: MediaPage, BuyerProductImagesPage and product/bulk-upload dialogs.

## Workflow, API and data

Create upload session/asset → signed/direct upload or ZIP validation → bounded
PNG/content/transparency checks → SKU/vendor matching and attachment → processing/
review/ready status → primary assignment/readiness → conditional product activation.
Some renditions use configured external storage; local paths are a separate branch.
Signing failure can return a placeholder URL (ISSUE-011).

[API](../reference/api/media.md) under `/api/v1/media/`; `/api/img/{code}` is a
separate plain Django proxy. [Schema](../reference/schema/media.md): MediaAsset,
MediaAssetVersion, Rendition, UploadSession. Owner/source/primary references may
be UUIDs rather than FKs. Dependencies: Product, tenant scope, storage providers,
Pillow, ZIP parsing, audit and notification events.

## Rules, security, tests and precautions

BR-MED-001, BR-CAT-001, BR-TEN-001: ready/approved transparent PNG primary is an
activation/visibility requirement. Preserve archive/replacement history, filename
sanitization, compressed/uncompressed bounds, tenant/SKU ambiguity guards and
buyer projection eligibility. Do not turn failed upload into synthetic readiness.

Tests: [validation](../../../backend/tests/test_media_validation.py),
[advanced rules](../../../backend/tests/test_media_rules_advanced.py),
[attachment](../../../backend/tests/test_media_attach_flow.py),
[bulk scope](../../../backend/tests/test_bulk_image_scope_regressions.py),
[buyer images](../../../backend/tests/test_buyer_product_images.py).
Test settings disable some runtime media gates for fixtures: enable them explicitly
when validating buyer visibility. Live storage signing/upload was not exercised.
