# media — model definition reference

Generated from Django metadata using test settings. No database queried.
This describes checked-in definitions, not applied/deployed schema.

## media.MediaAsset

Table: `media_asset`. Source: [backend/apps/media/models.py](../../../../backend/apps/media/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `asset_type` / `asset_type` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=30; default="upload_pending"` | `—` |
| `owner_module` / `owner_module` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `owner_record_id` / `owner_record_id` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `original_filename` / `original_filename` | `CharField` | `NOT NULL; length=500; default="<not set>"` | `—` |
| `file_extension` / `file_extension` | `CharField` | `NOT NULL; length=20; default="<not set>"` | `—` |
| `mime_type` / `mime_type` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `file_size_bytes` / `file_size_bytes` | `PositiveBigIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `width` / `width` | `PositiveIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `height` / `height` | `PositiveIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `has_transparency` / `has_transparency` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `review_status` / `review_status` | `CharField` | `NOT NULL; length=20; default="approved"` | `—` |
| `reviewed_at` / `reviewed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `reviewed_by` / `reviewed_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `review_notes` / `review_notes` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `rejection_reason` / `rejection_reason` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `alt_text` / `alt_text` | `CharField` | `NOT NULL; blank allowed; length=500; default="<not set>"` | `—` |
| `display_order` / `display_order` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `storage_key` / `storage_key` | `CharField` | `NOT NULL; blank allowed; length=1000; default="<not set>"` | `—` |
| `storage_provider` / `storage_provider` | `CharField` | `NOT NULL; length=50; default="s3"` | `—` |
| `content_hash` / `content_hash` | `CharField` | `NOT NULL; blank allowed; length=512; default="<not set>"` | `—` |
| `is_public` / `is_public` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `access_policy` / `access_policy` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `uploaded_by` / `uploaded_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `asset_type`: `[["product_image","Product Image"],["device_image","Device Image"],["brand_logo","Brand Logo"],["document","Document"],["video","Video (placeholder)"],["other","Other"]]`
- `status`: `[["upload_pending","Upload Pending"],["uploading","Uploading"],["validating","Validating"],["validation_failed","Validation Failed"],["processing","Processing"],["processing_failed","Processing Failed"],["ready","Ready"],["restricted","Restricted"],["revoked","Revoked"],["expired","Expired"],["superseded","Superseded"],["rejected","Rejected"],["archived","Archived"]]`
- `review_status`: `[["pending","Pending Review"],["approved","Approved"],["rejected","Rejected"]]`

Indexes: `[["django.db.models.Index",[],{"name":"media_asset_owner_m_81d58e_idx","fields":["owner_module","owner_record_id"]}],["django.db.models.Index",[],{"name":"media_asset_company_4b2141_idx","fields":["company_scope_reference","asset_type","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## media.MediaAssetVersion

Table: `media_asset_version`. Source: [backend/apps/media/models.py](../../../../backend/apps/media/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `asset` / `asset_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `media.MediaAsset; PROTECT; reverse=versions` |
| `version_number` / `version_number` | `PositiveIntegerField` | `NOT NULL; default="<not set>"` | `—` |
| `is_current` / `is_current` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `storage_key` / `storage_key` | `CharField` | `NOT NULL; length=1000; default="<not set>"` | `—` |
| `content_hash` / `content_hash` | `CharField` | `NOT NULL; length=512; default="<not set>"` | `—` |
| `file_size_bytes` / `file_size_bytes` | `PositiveBigIntegerField` | `NOT NULL; default="<not set>"` | `—` |
| `superseded_at` / `superseded_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["asset","version_number"]]`. Ordering: `["-version_number"]`.

## media.Rendition

Table: `media_rendition`. Source: [backend/apps/media/models.py](../../../../backend/apps/media/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `asset` / `asset_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `media.MediaAsset; PROTECT; reverse=renditions` |
| `rendition_type` / `rendition_type` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `storage_key` / `storage_key` | `CharField` | `NOT NULL; length=1000; default="<not set>"` | `—` |
| `width` / `width` | `PositiveIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `height` / `height` | `PositiveIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `file_size_bytes` / `file_size_bytes` | `PositiveBigIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `mime_type` / `mime_type` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `is_ready` / `is_ready` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["asset","rendition_type"]]`. Ordering: `[]`.

## media.UploadSession

Table: `media_upload_session`. Source: [backend/apps/media/models.py](../../../../backend/apps/media/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `asset` / `asset_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `media.MediaAsset; PROTECT; reverse=upload_sessions` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="initiated"` | `—` |
| `presigned_url` / `presigned_url` | `CharField` | `NOT NULL; blank allowed; length=2000; default="<not set>"` | `—` |
| `expected_filename` / `expected_filename` | `CharField` | `NOT NULL; length=500; default="<not set>"` | `—` |
| `expected_mime_type` / `expected_mime_type` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `expires_at` / `expires_at` | `DateTimeField` | `NOT NULL; default="<not set>"` | `—` |
| `completed_at` / `completed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `uploaded_by` / `uploaded_by` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["initiated","Initiated"],["uploading","Uploading"],["completed","Completed"],["failed","Failed"],["expired","Expired"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## Migrations

- [backend/apps/media/migrations/0001_initial.py](../../../../backend/apps/media/migrations/0001_initial.py)
- [backend/apps/media/migrations/0002_mediaasset_alt_text_mediaasset_display_order_and_more.py](../../../../backend/apps/media/migrations/0002_mediaasset_alt_text_mediaasset_display_order_and_more.py)
