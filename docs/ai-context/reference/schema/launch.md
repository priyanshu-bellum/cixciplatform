# launch — model definition reference

Generated from Django metadata using test settings. No database queried.
This describes checked-in definitions, not applied/deployed schema.

## launch.LaunchEvent

Table: `launch_event`. Source: [backend/apps/launch/models.py](../../../../backend/apps/launch/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `name` / `name` | `CharField` | `NOT NULL; length=300; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=30; default="draft"` | `—` |
| `target_launch_date` / `target_launch_date` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `product_readiness_references` / `product_readiness_references` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `device_readiness_references` / `device_readiness_references` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `pricing_readiness_references` / `pricing_readiness_references` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `notification_trigger_references` / `notification_trigger_references` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["draft","Draft"],["planning","Planning"],["readiness_check","Readiness Check"],["blocked","Blocked"],["ready","Ready"],["launched","Launched"],["cancelled","Cancelled"],["postponed","Postponed"],["post_launch_review","Post-Launch Review"],["closed","Closed"]]`

Indexes: `[["django.db.models.Index",[],{"name":"launch_even_company_10b7cf_idx","fields":["company_scope_reference","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## Migrations

- [backend/apps/launch/migrations/0001_initial.py](../../../../backend/apps/launch/migrations/0001_initial.py)
