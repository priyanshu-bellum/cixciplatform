# Launch / Event Management Assumptions And Open Questions

This document is proposal-level architecture. It lists assumptions and decisions still needed before implementation.

## Assumptions

- Launch / Event Management is a distinct bounded context per ADR-0018.
- Launch / Event Management owns launch coordination, launch event records, readiness workflow placeholders, participant readiness, milestones, visibility windows, launch status lifecycle, launch exception/review states, and launch events.
- Product Catalog owns product source records, product lifecycle, product availability, compatibility, product visibility, product publishing, and product media references.
- Device Catalog owns canonical Device References, release facts, launch dates, identity, manufacturer ownership, and lifecycle state.
- Tenant Company owns users, roles, permissions, company/entity scope, participant eligibility, Product Type enablement, licensed-property scope, region scope, and relationship eligibility.
- Pricing owns pricing readiness facts, pricing rules, discounts, quotes, effective prices, and commercial interpretation.
- Media / Image Asset Management owns media readiness facts, asset validation, transformations, URLs, downloadable assets, and asset metadata.
- Notification Platform Service owns delivery, digest, and fanout behavior.
- Analytics owns reporting models and metrics.
- AI Agent Services owns recommendations, confidence scores, drafts, and action outcomes.
- Integration Management owns external connection state, credentials, external references, external actions, and delivery/receipt evidence.
- Logs & Audit owns audit evidence and file tracking.
- Procurement / Purchase Orders owns PO lifecycle.
- Campaign execution, webinar ownership, and Marketing/Campaign Management remain future/placeholder.

## Scale Controls Placeholder

Future hardening should define proposal-level assumptions and controls for:

- Launch events per tenant.
- Launch events per device manufacturer.
- Launch events per accessory vendor.
- Launch events per buyer/entity.
- Tenant/date partitioning.
- Calendar pagination.
- Calendar filter indexing placeholders.
- Recurring event placeholder.
- Seasonal event placeholder.
- Participants per launch.
- Participant count caps/placeholders.
- Checklist items per launch.
- Checklist item caps/placeholders.
- Milestones per launch.
- Visibility windows per launch.
- Notification trigger references per launch.
- Notification fanout controls.
- Digest handoff to Notification.
- AI signals per launch.
- AI readiness signal volume controls.
- Analytics signals per launch.
- External project/calendar references per launch.
- External task/reference volume controls.
- Calendar query volume.
- Readiness update volume.
- Readiness queue priority.
- Stale-read warnings.
- Retention window placeholders.
- Launch event retention.

## Open Questions

- Which launch/event types are supported at launch?
- Should launch records be created automatically from Device Catalog launch dates or manually by admins?
- Should accessory launches be vendor-managed, admin-managed, or system-generated from Product Catalog data?
- Who can mark launch readiness complete?
- What readiness checklist items are required by launch type?
- What source-owned readiness evidence is required by launch type?
- What participant readiness states are required for device launches, accessory launches, branded merchandise launches, buyer readiness events, and promotional events?
- How do launch visibility windows interact with Product Catalog visibility?
- How do launch dates interact with Device Catalog release dates and lifecycle states?
- What source lifecycle conflicts block launch activation versus route to review?
- What notifications should be immediate versus digest?
- Which launch notifications are required/system notifications?
- Should Launch / Event Management manage webinars/training events or should that stay separate?
- Should campaign/promotion execution become a future Marketing/Campaign Management context?
- How are external project tools used without becoming source of truth?
- Which launch events should Analytics track?
- Which launch readiness signals may AI agents consume?
- How do launches support device/accessory bulk procurement planning?
- How should superseded launch records be retained and displayed?
- What audit evidence is required for launch status changes, readiness waivers, and manual overrides?
- What redaction rules apply to launch planning, commercial timing, promotional windows, and buyer/vendor/manufacturer readiness?

## Decisions Needed Before Implementation

- Launch/event type model.
- Launch status transition rules and terminal states.
- Status transition guard model.
- Readiness evidence contract with source modules.
- Readiness checklist template model.
- Manual waiver/override evidence model.
- Participant readiness model.
- Visibility window behavior and conflict rules.
- Source lifecycle evidence contract.
- Device launch auto-create versus manual-create behavior.
- Product/accessory launch creation authority.
- Promotional/campaign boundary and future Marketing/Campaign Management decision.
- Webinar/training event ownership.
- Notification trigger contract.
- AI action contract and approval requirements.
- Analytics signal contract.
- Integration external reference contract.
- Procurement planning signal contract.
- Logs & Audit evidence requirements.
- Scale assumptions and retention policy.

## Non-Goals For First Draft

- Do not define final launch implementation schema.
- Do not finalize readiness checklist templates.
- Do not finalize notification delivery behavior.
- Do not finalize campaign execution.
- Do not define Marketing/Campaign Management, Licensing, Payment, or Vendor Operational Interface modules.
- Do not move source-module operational ownership into Launch / Event Management.