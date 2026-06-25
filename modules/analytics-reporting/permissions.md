# Analytics / Reporting Permissions

This document is proposal-level architecture. It defines initial permission concepts without finalizing roles, policy implementation, identity provider behavior, or access enforcement implementation.

## Permission Principles

- All reports must be role-based and tenant-scoped.
- Tenant Company remains authority for hierarchy, users, roles, permissions, activation state, buyer/vendor/manufacturer scope, product-type eligibility, licensed-property scope, and relationship eligibility.
- Analytics must not grant access independently.
- Analytics consumes reporting permissions projections, access projections, source-module visibility rules, relationship eligibility evidence, product-type scope, licensed-property scope, and redaction classes.
- Cross-tenant reporting is denied by default except approved CIXCI system admin views.
- Customer-sensitive data is excluded or redacted by default.
- Cross-party reporting should deny by default when required visibility evidence is missing, stale, expired, conflicting, or insufficient.

## Proposal-Level Roles

- CIXCI System Admin Analytics Viewer.
- CIXCI System Admin Analytics Manager.
- Buyer Parent Analytics Viewer.
- Buyer Child Entity Analytics Viewer.
- Accessory Vendor Parent Analytics Viewer.
- Accessory Vendor Brand/Child Entity Analytics Viewer.
- Device Manufacturer Parent Analytics Viewer.
- Device Manufacturer Child Entity Analytics Viewer.
- Analytics Report Definition Manager placeholder.
- Analytics Export Approver placeholder.

Exact roles and mappings remain unresolved.

## Permission Actions

Proposal-level actions:

- View dashboard.
- View report definition.
- Run report.
- Save report.
- Manage own saved report.
- Create scheduled report placeholder.
- Request report export.
- Download report export.
- View sensitive report.
- Review sensitive export placeholder.
- Manage report definition.
- Manage metric definition.
- Trigger read model refresh placeholder.
- Request read-model rebuild/backfill/replay placeholder.
- Review data freshness warning.
- Review visibility evidence missing/stale warning.

## Audience Scope Rules

### Buyer Reports

Buyer reports may expose only buyer-authorized data for the buyer parent or child entity scope. Buyer views must not reveal vendor-private, manufacturer-private, other buyer, or customer-sensitive data unless explicitly allowed.

### Vendor Reports

Vendor reports may expose only vendor-authorized data. Vendor views must not reveal buyer-private data beyond approved adoption, export, order, performance, or opportunity signals. Vendor opportunity reports require source-owned relationship eligibility and source visibility evidence.

### Manufacturer Reports

Manufacturer reports may expose only manufacturer-authorized data. Manufacturer views must not reveal buyer-private or vendor-private data beyond approved device adoption, launch readiness, coverage, or opportunity signals. Manufacturer opportunity reports require source-owned relationship eligibility, product-type scope, licensed-property scope where applicable, and source visibility evidence.

### System Admin Reports

Approved CIXCI system admin views may cross tenant boundaries where required for platform operations. These views must be role-limited, auditable, redaction-aware, and separate from tenant-facing report views.

## Visibility Evidence Requirements

Proposal-level evidence for report access/export may include:

- Relationship eligibility snapshot reference.
- Source visibility snapshot reference.
- Product-type scope reference.
- Licensed-property scope reference.
- Access projection version.
- Tenant scope reference.
- Role / permission projection reference.
- Source module visibility reference.
- Redaction decision version.
- Recheck-before-export flag.

Analytics consumes this evidence from Tenant Company and source modules. Analytics must not infer buyer/vendor/manufacturer visibility.

## Redaction Classes

Proposal-level redaction classes should cover:

- Public/reporting-safe.
- Tenant-sensitive.
- Customer-sensitive.
- Pricing-sensitive.
- Invoice-sensitive.
- Warranty-sensitive.
- Media-rights-sensitive.
- Licensing-sensitive.
- Commercial-sensitive.
- Internal-only/system-admin.

## Export Permissions

Report export requires tenant/reporting scope, report definition eligibility, redaction class approval, visibility evidence, and role permission. Export files may be tracked by Logs & Audit. Export should be blocked or reviewed if access projection, relationship eligibility, source visibility, product-type scope, licensed-property scope, or redaction decision is stale, missing, expired, or conflicts with source-module visibility rules.

Sensitive report exports may require review. Exported files should carry export access decision references, export redaction class, export retention class, expiration/revocation/supersession status, and download audit references where applicable.

## Sensitive Report Access

Access to sensitive reports should produce an auditable event such as `analytics.report.accessed.sensitive`. Logs & Audit owns audit evidence; Analytics owns the reporting access event/reference.

## Access Projection Lifecycle

Analytics should treat access projections as consumed inputs. Proposal-level projection fields include scope, role, source visibility references, relationship eligibility references, product-type scope, licensed-property scope, redaction class, redaction decision version, generated timestamp, version, expiration/recheck placeholder, and source module references.

If access projections are stale, expired, missing, or conflicting, Analytics should block, delay, or route report access/export to review according to future policy.

## AI Access

AI agents may consume Analytics outputs only when the same authorization, visibility evidence, tenant scope, role permission, and redaction rules permit access. AI must not use Analytics to bypass source-module permissions or cross-party visibility controls.

## Scheduled System Admin Activity Summary Aggregation Permissions (Cross-Module PR)

This section adds proposal-level permission concepts for the Analytics / Reporting side of the scheduled summary email cross-module hardening pass. Notification Platform Service and Logs & Audit File Tracking carry reciprocal permission sections. Tenant Company remains the authority for role definitions.

### Phase 1 actor inventory

- **CIXCI System Admin** - authorized to view Activity Summary Reporting Windows and Activity Summary Aggregation Records in Phase 1. Vendor users and buyer users are excluded.
- **System service identity for Analytics aggregation** - the implementation-layer identity that Analytics Workflows 4, 5, 6 operate under. Authority resolution at the implementation layer.

### Activity Summary Reporting Window permissions

- `activity_summary_reporting_window.read` - permission to view a Reporting Window and its current lifecycle state. CIXCI System Admin only in Phase 1.
- `activity_summary_reporting_window.search` - permission to search across Reporting Windows (for example, all `delivery_failed` windows for operator review). CIXCI System Admin only in Phase 1.

PR-C does not introduce permissions to manually create, mutate, or transition Reporting Window state. Windows are created by Analytics Workflow 4 and transitioned by Workflows 5, 6 (and indirectly by NPS Workflows 8, 9 for `delivery_failed`, `delivered`, `superseded` transitions).

### Activity Summary Aggregation Record permissions

- `activity_summary_aggregation_record.read` - permission to view the aggregation record content. CIXCI System Admin only in Phase 1.
- `activity_summary_aggregation_record.search` - permission to search across aggregation records. CIXCI System Admin only in Phase 1.

PR-C does not introduce mutation permissions for the aggregation record. The record is immutable once created.

### Recipient scope authority (Analytics side)

- Analytics / Reporting does not resolve recipient scope. Recipient resolution is Notification Platform Service territory (NPS Workflow 3) using Tenant Company `check_access`.
- The Activity Summary Aggregation Record content is platform-wide CIXCI System Admin scope in Phase 1; the recipient list comes from Notification Platform Service at delivery time and is not stored on the aggregation record itself.

### Vendor / buyer exclusion guardrail (Analytics side)

PR-C strictly excludes vendor users and buyer users from:

- Activity Summary Reporting Window visibility.
- Activity Summary Aggregation Record visibility.
- Summary Source Fact Reference content (the references could expose buyer-specific or vendor-specific identifiers if shown to non-authorized actors; Phase 1's CIXCI-internal-only scope is the control).

Future per-tenant summary work must apply Tenant Company `check_access` filtering before exposing Summary Source Fact References to per-tenant recipients.

### Permission concepts NOT introduced

- Per-tenant aggregation record access. Phase 1 is CIXCI-internal-only.
- Aggregation record mutation. Immutability is preserved.
- Manual aggregation re-trigger. Future operator-surface PR.
- Manual Reporting Window state override. Future operator-surface PR.
- Aggregation record export via the existing Analytics report export mechanism. Phase 1 does not introduce summary-specific export.
- Late source fact reconciliation operator action. Architectural expectation only; implementation deferred.

### Audit requirements

The following PR-C operations are auditable:

- Reporting Window state transitions (creation, evaluation, aggregated, suppressed_no_activity, delivered, delivery_failed, superseded).
- Aggregation record creation.
- No-activity suppression outcome production at Analytics (Reporting Window transition to `suppressed_no_activity`, the suppression-outcome event, and the Logs & Audit Workflow 10 trigger). The cursor advancement that follows is performed by Notification Platform Service in NPS Workflow 9 Trigger B path **after** Analytics has emitted its outcome and Logs & Audit has recorded the Suppression Evidence; the cursor-advancement audit reference is recorded on the NPS side via the existing Audit Record entity pattern, not on the pre-cursor Suppression Evidence record. Analytics never writes to the configuration cursor.
- Late source fact arrival disposition (when implemented; Phase 1 architectural expectation).

### Existing Analytics / Reporting access projection patterns

Existing Analytics / Reporting access projection, role / permission projection, source visibility evidence, relationship eligibility evidence, product-type scope, licensed-property scope, redaction class, and redaction decision version patterns continue to apply unmodified.

PR-C's Activity Summary Reporting Window and Activity Summary Aggregation Record are internal-scope (CIXCI System Admin only); existing access projection patterns naturally enforce this scope without modification.

### Boundary restrictions (PR-C reaffirmations)

The Analytics / Reporting PR-C permissions must not grant:

- Activity Summary Configuration mutation authority. Configuration lives at Notification Platform Service.
- Activity Summary Delivery Attempt mutation authority. Delivery attempts live at Notification Platform Service.
- Logs & Audit File Tracking evidence record mutation authority. Amendments use existing Logs & Audit workflows.
- Source-module record mutation authority (PR #91, PR #92, PR #93, PR #94 entities all read-only).
- Tenant Company role mutation authority.
- Cursor advancement authority of any kind. **The cursor lives on the Notification Platform Service Activity Summary Configuration entity and is advanced exclusively by NPS Workflow 9.** Both the successful-delivery cursor-advancement trigger (Trigger A) and the consumed-no-activity-suppression-outcome cursor-advancement trigger (Trigger B) are NPS-side actions. Analytics produces the suppression outcome only and never writes to the configuration cursor.
