# Vendor integration execution checklist

Scope: complete catalog/export/order/fulfillment and Admin setup, for supported
multi-Vendor REST/JSON contracts. Work stays local and unpushed. Follow Supplier
Routing v1.2, Buyer Pricing Mode guide and the verified Balaji contract.

## Rules established before implementation

- Company-wise Buyer keys remain company-wise. Requests stay in an authorized
  Buyer Entity; a storefront is explicit, never selected from the first user.
- Export selection freezes Product, supplier and Pricing evidence. Supplier
  changes create mapping versions; accepted orders/returns retain their source.
- A legacy order is resolvable only from one authorized Buyer export selection.
  Ambiguity, foreign references and vendor mismatches block all handoff writes.
- Vendor connections own credentials and capability configuration. Generic JSON
  paths/status maps are supported; unsupported protocols require adapters.
- Balaji delivery ETA and package line quantities are not supplied by the
  documented shipment schema. Preserve unknown values and hold incomplete
  parent shipping updates; do not infer coverage from a shipped label.
- Required Product enrichment remains a business-data prerequisite. Do not
  invent Launch Date, MSRP, Brand approvals, categories or compatibility scope.
- Live dispatch and webhook registration against a real provider are not enabled
  automatically by local configuration. Tests use fixtures/test mode/dry runs.

## Sequential work

- [ ] EXP: storefront/export selection schema, scoped APIs, versioned references,
  export writer and conservative migration exceptions.
- [ ] ORD: atomic inbound resolution, accepted line/pricing/supplier evidence,
  idempotency and immutable retry routing; remove first-match resolution.
- [ ] Vendor capabilities: generic/Balaji config, bounded order transport,
  durable dispatch, provider status and test workflow.
- [ ] Webhooks: per-connection encrypted signing secrets, public callback URL,
  registration/test/rotation UI, signature/replay checks and durable processing.
- [ ] SHP: packages/line quantities, pending Operations view, polling/events,
  parent completeness and one logical Buyer update through every outbound path.
- [ ] UI: one Vendor page for setup, capability tests, dispatch/events/shipments;
  Buyer storefront/export configuration and shared dashboard/API behavior.
- [ ] Pricing contract review, migrations, adversarial backend/UI verification,
  updated guides and deployment checklist. No push.

Each completed module records its tests and remaining inputs here. A working
catalog fetch or an HTTP 200 read is not completion of the whole sequence.
