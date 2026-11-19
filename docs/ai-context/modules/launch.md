# Launch coordination

Purpose: coordination records with product/device/pricing readiness references.
Feature LCH-001 is partial: model/CRUD/UI exist; complete readiness calculation,
approval, event delivery and lifecycle orchestration were not verified.

## Entry points, workflow and files

[LaunchEvent model](../../../backend/apps/launch/models.py),
LaunchEventSerializer/ViewSet in [shared_api](../../../backend/apps/shared_api.py),
frontend [LaunchPage](../../../frontend/src/pages/LaunchPage.tsx).
Current flow creates/edits an event with target date, status and JSON reference
lists. Enum states describe possibilities; they do not establish a validated
transition engine. Existing launch specifications are broader than this flow.

## API, entities and dependencies

[API](../reference/api/launch.md): `/api/v1/launch/events/` and detail CRUD.
[Schema](../reference/schema/launch.md): LaunchEvent, company UUID and readiness/
notification references. Dependencies are tenant authority and read-only references
to catalog/devices/pricing/NPS; no ownership of those modules' source truth.

## Rules, security, tests and precautions

BR-SRC-001, BR-TEN-001. ISSUE-004: global queryset lacks tenant-scoped get_queryset;
creation company assignment is not read isolation. ISSUE-007: readiness orchestration
incomplete. No dedicated launch regression suite was found in backend/tests.
TASK-004/007 must define audience and add isolation/readiness coverage before new
behavior. Do not infer approval rules or auto-change product/device/pricing state
from launch status. ADR-0018 remains proposed design, not implementation proof.
