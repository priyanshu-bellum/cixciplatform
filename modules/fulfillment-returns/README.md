# Fulfillment and Returns Module

This module is a proposal-level architecture specification for the Fulfillment and Returns bounded context.

Fulfillment and Returns owns operational execution state after Order Routing requests fulfillment handling for routed suborders. It records fulfillment handoff disposition, vendor/manufacturer fulfillment updates, shipment state, tracking references, shipped/delivered evidence, return operational state, return export/import workflows, return receipt evidence, return condition evidence, vendor return disposition evidence, replacement execution, and fulfillment/return exceptions.

All content is proposal-level. It does not finalize carrier integrations, vendor contracts, shipment status mapping, return approval rules, replacement policies, SLA targets, notification rules, refund behavior, invoice triggers, file schemas, or implementation design.

## Source Guidance

This module should be read with:

- ADR-0010 Fulfillment and Returns bounded context.
- ADR-0009 Order Routing bounded context.
- ADR-0008 Warranty Registration and Claim Support.
- ADR-0007 Category-Extensible Product Catalog.
- ADR-0006 AI Agent Services.
- ADR-0005 Pricing.
- ADR-0004 Device Catalog.
- Tenant Company module.
- Product Catalog module.
- Device Catalog module.
- Pricing module.
- Order Routing module.
- Invoice Management module.
- Integration Management module.
- Logs & Audit File Tracking module.
- Notification Platform Service module.
- Analytics / Reporting module.
- `architecture/standards/import-export-validation-governance.md`.
- Architecture domain glossary and core entities.

## Boundary Summary

Fulfillment and Returns consumes:

- Fulfillment handoff request references, routed suborder references, vendor export batch/item references, and routing snapshot references from Order Routing.
- Product Catalog and Device Catalog references.
- Product Type without owning Product Type definitions.
- Tenant scope, buyer/entity scope, vendor scope, and permission references without deriving eligibility.
- Pricing snapshot or adjustment evidence references without recalculating price.
- Integration transport references without owning transport delivery/receipt state.
- Logs & Audit evidence references without owning immutable file/audit evidence.
- Warranty replacement approval signal where an owning warranty-support workflow provides it.

Fulfillment and Returns owns:

- Fulfillment handoff disposition and operational execution state.
- Vendor fulfillment import validation/application as operational evidence.
- Shipment records, tracking references, shipment evidence, and shipment status history.
- Vendor return export/import workflow state.
- RAN validation, return matching validation, return receipt, return condition evidence, and vendor return disposition evidence.
- Vendor-provided refund/adjustment evidence references only as operational evidence.
- Buyer shipment/return update-ready signals.
- Fulfillment/return exceptions and review state.

Fulfillment and Returns does not own:

- Order Routing decisions, vendor order export eligibility, routed-suborder export content, or handoff request creation.
- Pricing calculation, pricing snapshots, pricing interpretation, refunds, credits, or adjustment pricing evidence.
- Invoice lifecycle, payment processing, final refund/credit/adjustment outcomes, or settlement.
- Integration delivery/receipt evidence, carrier/provider callback receipt evidence, external retries, or provider failures.
- Notification delivery, scheduled email delivery, templates, recipient resolution, or notification history.
- Logs & Audit immutable file/download/import/export evidence or retention.
- Product/device/media source-of-truth records.
- Tenant eligibility, relationship approval, or user/entity access.
- Warranty eligibility or claim approval.
- Procurement purchase order lifecycle.
- Analytics reporting definitions.

## Files

- `spec.md` - module purpose, scope, capabilities, import/export governance, and boundary rules.
- `data-model.md` - proposal-level entities, relationships, ownership, and retention notes.
- `api-contracts.md` - domain API contract concepts.
- `openapi-contracts.md` - implementation-oriented endpoint template and schema notes.
- `events.md` - event catalog and event modeling notes.
- `event-contracts.md` - event interface contract template for this module.
- `boundary-contracts.md` - explicit may answer / must not answer boundaries.
- `permissions.md` - roles, permission concepts, and approval guardrails.
- `workflows.md` - handoff disposition, vendor fulfillment import, shipment tracking, return export/import, return disposition, replacement, retry, and exception workflows.
- `edge-cases.md` - edge cases and unresolved behavior risks.
- `test-scenarios.md` - proposal-level validation scenarios.
- `assumptions-open-questions.md` - scale assumptions, open questions, and decisions needed.
- Export Delivery to Fulfillment SLA Handoff (Boundary/Handoff PR) - Cross-Module Handoff Record as Fulfillment / Returns-owned consumer-side record of confirmed Vendor Export Delivery Evidence observation (Order Routing, PR #91, read-only); Handoff Idempotency Key derived from `vendor_export_delivery_evidence_reference` + consumer scope; six lifecycle states (`pending`, `consumed`, `replay_acknowledged`, `consumption_skipped`, `consumption_failed`, `consumption_held`); reference-only Source Evidence Snapshot Reference (not a copy); two interlocking workflows (Workflow A - Handoff Receipt for `confirmed` source; Workflow B - Non-Confirmed Delivery Evidence Handling for `failed` / `unconfirmable` / `partial` source); three contract rules (Fulfillment SLA Handoff Eligibility, Non-Confirmed Delivery Evidence Handling, Handoff Ordering); replay-time eligibility invariant (original decision honored, no re-evaluation); resolves PR #92 OQ C with conservative Phase 1 disposition (no SLA clock from non-`confirmed` source); zero new events on either side (handoff contracted around existing PR #91 and PR #92 events); no new entities on Order Routing side; no Order Routing data-model / workflows / events / permissions / api-contracts modified; no new permissions or API contract placeholders introduced; `modules/order-routing/vendor-export-fulfillment-handoff-governance.md` updated with light cross-reference only (<=15 lines added, 0 removed)

## PR-A Focus

- Vendor Fulfillment Response SLA and Late/Missing Import Exceptions (PR-A) — per-vendor Vendor Fulfillment Response SLA Policy (timezone, same-day cutoff, same-day response deadline, next-business-day response deadline, business calendar reference, complete-response definition); SLA Evaluation Record as authoritative per-suborder-per-response record consuming Order Routing PR #91 Vendor Export Delivery Evidence read-only; three distinct Exception entities (Late, Missing, Partial) with shared SLA Breach Review State enumeration; SLA Override / Excuse Evidence as immutable audit-bearing entity (reversal via new reversing record); Fulfillment Import Received Timestamp as transport-receipt-time field on existing Fulfillment Import entity; ten interlocking workflows (Policy configuration, Delivery Evidence consumption, Expected Deadline calculation, Import timestamp capture, On-Time evaluation, Late/Missing/Partial Exception creation, Breach Review, Override Evidence); SLA Configuration Authority and SLA Override Authority operationalized with distinct failure modes (`SLA_OVERRIDE_AUTHORITY_REQUIRED` vs `SLA_OVERRIDE_AUDIT_EVIDENCE_MISSING`); 17 additive event names across six families; read-only API placeholders; reference-first event payload discipline with tenant-scoped redaction; SLA evaluation layer only — does not modify Order Routing (consumes Vendor Export Delivery Evidence read-only), does not finalize cross-module handoff contract (Boundary/Handoff PR), does not introduce Delivery Date hardening or buyer update expansion (Fulfillment / Returns PR-B), does not introduce scheduled summary email delivery or analytics aggregation (Cross-Module Summary Email PR)
- Delivery Date and Buyer Update Hardening (PR-B) - Delivery Date Evidence as the authoritative per-shipment-line record of vendor-reported delivery dates with validation outcomes (`accepted`, `rejected_invalid_format`, `rejected_before_shipped`, `rejected_before_order_creation`, `rejected_before_tracking_evidence`, `rejected_stale`, `rejected_duplicate`, `rejected_regression_without_authority`, `superseded`); Delivered Shipment Evidence as field extensions on existing Shipment Line; Delivery Date Correction Evidence as immutable authority-gated entity for post-Delivered corrections (with distinct failure modes `DELIVERY_DATE_CORRECTION_AUTHORITY_REQUIRED` and `DELIVERY_DATE_CORRECTION_AUDIT_EVIDENCE_MISSING`); Buyer Update-Ready Signal as a single entity with `update_kind` discriminator (`shipment`, `delivery`, `correction`) and seven lifecycle states (`pending`, `held`, `eligible`, `dispatched`, `acknowledged`, `failed`, `superseded`); Buyer Update Suppression / Hold State with explicit hold reasons (`held_awaiting_all_vendors_shipped`, `held_awaiting_all_vendors_delivered`, `held_buyer_integration_paused`, `held_correction_under_review`, `held_tenant_scope_inactive`, `held_manual`); Multi-Vendor / Multi-Suborder Buyer Update Rule with Phase 1 default of all-vendors aggregation; Stale, Duplicate, and Out-of-Order Delivery Update handling rules; Delivery Date Override / Correction Authority with vendor user exclusion in Phase 1; PR #92 SLA-semantics preservation invariant explicit; source-agnostic naming for future carrier integration; twelve workflow sections (Vendor Fulfillment Import Delivery Date Intake; Delivery Date Validation; Shipment Status Evidence Update; Stale Delivery Update Handling; Duplicate Delivery Update Handling; Delivery Date Correction Evidence including auto-reject and authority-gated paths; Buyer Shipment Update-Ready; Buyer Delivery Update-Ready; Buyer Update Eligibility Evaluation; Integration Management Dispatch Handoff; Buyer Update Hold / Suppression Re-Evaluation; Buyer Update Failure / Acknowledgement Reference Capture); thirteen additive events across Delivery Date Evidence lifecycle (3), Delivered Shipment Evidence (1), Delivery Date Correction Evidence lifecycle (3), and Buyer Update-Ready Signal lifecycle (6); reference-only `buyer_integration_profile_reference` field; reference-only `buyer_update_dispatch_reference`, `buyer_update_acknowledgement_reference`, `buyer_update_failure_reference` fields with Integration Management as transport owner; read-only API placeholders for Delivery Date Evidence lookup, Buyer Update-Ready lookup, Delivery Date Correction Evidence lookup, Buyer Update Hold / Suppression lookup, and Buyer Update Dispatch / Acknowledgement / Failure Reference lookup; no Order Routing modification, no Integration Management / Notification Platform Service / Tenant Company / Logs & Audit / Analytics modification, no OpenAPI schemas, no runtime code, no new SLA events, no buyer-update transport mechanics, no carrier integration, no scheduled summary email or analytics aggregation; new redaction class `buyer_scoped` introduced for Buyer Update-Ready Signal event family; Buyer Update-Ready does not equal buyer update delivered (only `acknowledged` state constitutes evidence of buyer delivery)
