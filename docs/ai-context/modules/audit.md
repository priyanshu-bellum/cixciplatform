# Audit, evidence and file tracking

Purpose: append-only observations, evidence artifacts, correction lineage and file
lifecycle tracking. Feature AUD-001 is partial due to verified source defects.

## Entry points, workflow and data

[Models](../../../backend/apps/audit/models.py), [views](../../../backend/apps/audit/views.py),
[serializers](../../../backend/apps/audit/serializers.py), [URLs](../../../backend/apps/audit/urls.py).
Domain audit helpers create AuditRecord; EvidenceRecord protects its audit parent;
amendment/supersession add corrections; FileTrackingRecord references audit/evidence.
Actor and service trigger are separate; company scope, source-module triad,
correlation/idempotency and governance classifications describe provenance.

[Active APIs](../reference/api/audit.md) are read-only audit/file/import/export views
under `/api/v1/audit/`; tenant also exposes an audit route. Admin/vendor access and
company filters differ across views. No standalone audit frontend page was verified.
[Complete schema](../reference/schema/audit.md) lists the five owned models and
PROTECT links. These hooks do not establish database-level append-only enforcement.

## Dependencies, rules and security

All domain modules consume this spine. BR-AUD-001 and BR-TEN-001 require meaningful
action evidence and tenant isolation. Do not combine human and scheduler identities,
erase correction lineage or expose raw evidence cross-company. Model save guards
can be bypassed by queryset updates/deletes, bulk_create and SQL; inspect callers.

## Tests, gaps and precautions

[Immutability tests](../../../backend/tests/test_models_immutable.py) cover several
other domain snapshots, not all audit creation paths. ISSUE-001: three UUID-PK
guards reject first saves. ISSUE-002: batch view filters use undefined FileDirection
members. TASK-002 must add creation/filter regressions before changes. Do not label
the full audit lifecycle complete because AuditRecord itself can be created.
