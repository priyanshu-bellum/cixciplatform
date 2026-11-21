# ADR-0019 — Governed vendor product audit

- Date: 2026-11-21
- Status: accepted for TASK-015 by explicit user implementation specification.
- Context: provider observations, canonical products and buyer eligibility are
  separate records. Admins need comparison and deliberate corrections without
  duplicating compatibility logic or exposing raw feeds to buyer/vendor roles.
- Decision: add admin-only audit actions to ProductViewSet, with a separate query/
  mutation service. Derive source comparison fields from saved connector mappings.
  Filter audit status before bounded pagination. Reuse canonical compatibility
  commands; preserve exclusions, locks, historical evidence and other buyer gates.
  Explicit source review clears append old errors to audit. Page review notifications
  use existing in-app schema and after-commit WebSocket publication.
- Reasoning: meet the requested review flow with one compatibility authority and
  accurate filtered totals. The user's separate confirmation authorizes missing
  brand links as authorized_distributor; inactive decisions remain authoritative.
- Alternatives considered: post-filtering a serialized page (rejected: wrong counts
  and empty pages), direct assertion writes (rejected: lost governance/history),
  swallowing bulk exceptions (rejected: unreported partial failures).
- Trade-offs: explicit evidence can remain ineffective under current category/type/
  lifecycle gates; responses report unapplied device IDs. Product audit lists do not
  include unlinked source observations; stats distinguish those rows. Image presence
  badges check stored primary reference, not a network/storage health probe.
- Affected modules: catalog, integration, notification, frontend catalog, audit;
  CAT-002, INT-002, CMP-001/002. No database schema changes or dependencies.

## 2026-11-22 — Clarification adopted before phase 3 completion

The user explicitly chose Hybrid configuration for Feature Based manual mapping,
and requested per-product Universal controls. Audit writes now use ordinary
canonical command validation rather than vendor-import bypass. Category selection
opens a side panel with configured required answers and explicit scope selection;
rule adjustment opens the existing audited global category editor. No automatic
global mode change or per-product explicit override was introduced. Product-level
Universal remains independent of category with deliberately selected approved
types. Future pending selections are distinguished from protected exclusions/locks;
other ineffective selections roll back and return a meaningful validation error.
