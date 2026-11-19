# media — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.shared_api.BuyerProductImagesViewSet

Handler: [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"media.buyer_images.list","images":"media.buyer_images.list","filter_options":"media.buyer_images.list","download_image":"media.buyer_images.download","download_all":"media.buyer_images.download"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/media/buyer-product-images/` | `list` |
| GET | `/api/v1/media/buyer-product-images/filter-options/` | `filter_options` |
| GET | `/api/v1/media/buyer-product-images/{pk}/download-all/` | `download_all` |
| GET | `/api/v1/media/buyer-product-images/{pk}/download-image/{asset_id}/` | `download_image` |
| GET | `/api/v1/media/buyer-product-images/{pk}/images/` | `images` |

- `list`: `apps.shared_api.BuyerProductImagesViewSet.list` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: `search`, `vendor`. Direct Response dictionary keys: none declared. Local service imports: `apps.catalog.api.ProductPagination`, `apps.media.models.MediaAsset`, `apps.tenant.models.Company`.
- `filter_options`: `apps.shared_api.BuyerProductImagesViewSet.filter_options` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `brands`, `categories`. Local service imports: none declared.
- `download_all`: `apps.shared_api.BuyerProductImagesViewSet.download_all` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: `apps.media.services.log_media_audit`.
- `download_image`: `apps.shared_api.BuyerProductImagesViewSet.download_image` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: `apps.media.services.log_media_audit`.
- `images`: `apps.shared_api.BuyerProductImagesViewSet.images` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `images`, `product_id`, `product_name`, `sku`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/BuyerProductImagesPage.tsx](../../../../frontend/src/pages/BuyerProductImagesPage.tsx).

## apps.shared_api.MediaAssetViewSet

Handler: [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Declared queryset model: `media.MediaAsset`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"media.asset.list","retrieve":"media.asset.read","create":"media.asset.upload","update":"media.asset.manage","partial_update":"media.asset.manage","destroy":"media.asset.manage","renditions":"media.asset.read","request_upload":"media.asset.upload","upload_file":"media.asset.upload","upload_zip":"media.asset.upload","review":"media.asset.manage","reorder":"media.asset.manage","finalize_upload":"media.asset.upload"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.shared_api.MediaAssetSerializer` at [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py).

Serializer fields: `["id","asset_type","status","owner_module","owner_record_id","company_scope_reference","original_filename","mime_type","file_size_bytes","storage_key","storage_provider","content_hash","is_public","created_at","width","height","has_transparency","alt_text","display_order","review_status","reviewed_at","review_notes","rejection_reason"]`. Read-only fields: `["id","created_at","storage_key","content_hash","width","height","has_transparency","review_status","reviewed_at","review_notes","rejection_reason"]`. Excluded: `[]`. Validation methods: `validate_alt_text`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/media/assets/` | `list` |
| POST | `/api/v1/media/assets/` | `create` |
| POST | `/api/v1/media/assets/reorder/` | `reorder` |
| POST | `/api/v1/media/assets/request_upload/` | `request_upload` |
| POST | `/api/v1/media/assets/upload_zip/` | `upload_zip` |
| GET | `/api/v1/media/assets/{pk}/` | `retrieve` |
| PUT | `/api/v1/media/assets/{pk}/` | `update` |
| PATCH | `/api/v1/media/assets/{pk}/` | `partial_update` |
| DELETE | `/api/v1/media/assets/{pk}/` | `destroy` |
| POST | `/api/v1/media/assets/{pk}/finalize_upload/` | `finalize_upload` |
| GET | `/api/v1/media/assets/{pk}/renditions/` | `renditions` |
| POST | `/api/v1/media/assets/{pk}/review/` | `review` |
| POST | `/api/v1/media/assets/{pk}/upload_file/` | `upload_file` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `reorder`: `apps.shared_api.MediaAssetViewSet.reorder` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: `ordered_asset_ids`, `product_id`. Direct Response dictionary keys: `order`, `product_id`, `updated`. Local service imports: `apps.catalog.models.Product`, `apps.media.services.emit_media_change_events`, `apps.media.services.log_media_audit`.
- `request_upload`: `apps.shared_api.MediaAssetViewSet.request_upload` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: `alt_text`, `asset_type`, `filename`, `is_public`, `mime_type`, `owner_module`, `owner_record_id`. Direct Response dictionary keys: none declared. Local service imports: `apps.media.services.emit_media_change_events`, `apps.media.services.log_media_audit`, `apps.media.validation.extension_of`, `apps.tenant.models.Company`.
- `upload_zip`: `apps.shared_api.MediaAssetViewSet.upload_zip` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: `company_scope_reference`, `vendor_company_reference`. Direct Response dictionary keys: `created`, `duplicates`, `error`, `failed`, `matched`, `products_now_active`, `products_now_media_ready`, `products_still_media_incomplete`, `products_updated`, `results`, `summary`, `total_files`, `unmatched`, `wrong_vendor`. Local service imports: `apps.catalog.models.Product`, `apps.catalog.services.reconcile_product_activation`, `apps.media.matching.match_product`, `apps.media.models.MediaAsset`, `apps.media.models.MediaAssetVersion`, `apps.media.models.Rendition`, `apps.media.readiness.compute_media_readiness`, `apps.media.services.emit_media_change_events`, `apps.media.services.generate_renditions`, `apps.media.services.log_media_audit`, `apps.media.validation`, `apps.tenant.models.Company`.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `finalize_upload`: `apps.shared_api.MediaAssetViewSet.finalize_upload` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: `confirm_replace`, `set_as_primary`. Direct Response dictionary keys: `details`, `error`. Local service imports: `apps.media.validation`.
- `renditions`: `apps.shared_api.MediaAssetViewSet.renditions` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: `apps.media.models.Rendition`.
- `review`: `apps.shared_api.MediaAssetViewSet.review` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: `decision`, `reason`. Direct Response dictionary keys: `error`. Local service imports: `apps.media.services.emit_media_change_events`, `apps.media.services.emit_media_event`, `apps.media.services.log_media_audit`.
- `upload_file`: `apps.shared_api.MediaAssetViewSet.upload_file` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: `confirm_replace`, `set_as_primary`. Direct Response dictionary keys: `error`. Local service imports: `apps.media.services.emit_media_change_events`, `apps.media.services.generate_renditions`, `apps.media.services.log_media_audit`, `apps.media.validation`, `apps.tenant.models.Company`.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/catalog/dialogs/BulkUploadDialog.tsx](../../../../frontend/src/pages/catalog/dialogs/BulkUploadDialog.tsx), [frontend/src/pages/catalog/dialogs/ProductFormDialog.tsx](../../../../frontend/src/pages/catalog/dialogs/ProductFormDialog.tsx), [frontend/src/pages/DashboardPage.tsx](../../../../frontend/src/pages/DashboardPage.tsx), [frontend/src/pages/MediaPage.tsx](../../../../frontend/src/pages/MediaPage.tsx), [frontend/src/pages/StubPages.tsx](../../../../frontend/src/pages/StubPages.tsx).

## apps.shared_api.UploadSessionViewSet

Handler: [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Declared queryset model: `media.UploadSession`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"media.asset.list","retrieve":"media.asset.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.shared_api.UploadSessionSerializer` at [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py).

Serializer fields: `["id","asset","status","presigned_url","expected_filename","expected_mime_type","expires_at","completed_at","created_at"]`. Read-only fields: `["id","created_at","presigned_url"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/media/upload-sessions/` | `list` |
| GET | `/api/v1/media/upload-sessions/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/MediaPage.tsx](../../../../frontend/src/pages/MediaPage.tsx).

