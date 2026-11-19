# Device catalog and buyer portfolios

Purpose: governed device reference truth, feature/capability evidence, lifecycle and
shared buyer My Devices. Features DEV-001/002.

## Entry points, workflow and files

[models](../../../backend/apps/devices/models.py), [views](../../../backend/apps/devices/views.py),
[serializers](../../../backend/apps/devices/serializers.py), [services](../../../backend/apps/devices/services.py),
[tasks](../../../backend/apps/devices/tasks.py), [URLs](../../../backend/apps/devices/urls.py).
Frontend [DevicesPage](../../../frontend/src/pages/DevicesPage.tsx); shared
compatibility options also feed catalog editors.

Reference CRUD/import validates types/manufacturers/features/lifecycle and canonical
compatibility values. Portfolio add/remove checks capability and company/entity,
updates references, freezes snapshots/change history, and directly calls projection
recalculation for affected users. Event helper is not a universal event bus.
Hourly task updates lifecycle by dates; buyer reads also apply eligibility rules.

## API, data and dependencies

[Routes/actions](../reference/api/devices.md): `/api/v1/devices/`, portfolio
`my_devices/`, `add/`, `remove/`, `history/`, `snapshots/`.
[All entities](../reference/schema/devices.md): Device, DeviceType, Manufacturer,
feature groups/values/assignments, capability profiles/evidence, normalization/
quality records, compatibility markers, portfolio references/snapshots/changes.
Dependencies: tenant authority, audit, catalog canonical value contract and projections.

## Rules, security, tests and precautions

BR-DEV-001, BR-SRC-001, BR-CMP-001. Portfolios share company/entity data; do not
reintroduce per-user visibility by blindly inheriting the triad mixin. Projection
keys still include a user. Empty portfolio is valid. Never rewrite capability
evidence from accessory guesses. Check launch-date/archive rules on both mutation
and read paths. ISSUE-007 records direct-call event implementation limits.

Tests: [devices](../../../backend/tests/test_devices.py),
[launch visibility](../../../backend/tests/test_device_launch_date_visibility.py),
[lifecycle](../../../backend/tests/test_device_lifecycle_task.py),
[projection sync](../../../backend/tests/test_buyer_projection_sync.py),
[device dropdown UI](../../../scripts/verify-device-dropdown-ui.mjs).
Changing type options/rules affects manual entry, imports, auto-mapping, universal
scope and cached projections; trace all those consumers before edits.
