# ADR-0007: Category-Extensible Product Catalog

## Status

Proposed

## Context

CIXCI's primary model remains accessory-first for MVNOs, wireless carriers, and retailers selling device accessories.

However, some buyers such as sports teams, leagues, and branded retailers may want to sell non-accessory branded merchandise such as hats, shirts, sweatshirts, jerseys, sweatpants, and other licensed products.

These products require different attributes, variants, validation rules, images, licensing metadata, and fulfillment facts than accessories. If Product Catalog expands to support these products without guardrails, it could weaken the core accessory model, blur compatibility rules, and push unrelated retail, licensing, media, pricing, fulfillment, or campaign responsibilities into Product Catalog.

ADR-0004 split Device Catalog from Product Catalog so canonical Device data remains outside accessory catalog ownership. ADR-0005 clarified that Pricing owns commercial interpretation and calculation. ADR-0006 clarified that AI Agent Services may consume Product Catalog signals but does not own Product Catalog source records. This ADR adds proposal-level guidance for supporting optional non-accessory product types without disrupting those boundaries.

## Decision

Product Catalog remains accessory-first.

Product Catalog may support optional non-accessory product types through a controlled product-type extension model.

This means Product Catalog can reuse shared product primitives such as product identity, vendor identity, identifiers, variants, taxonomy, lifecycle, publication, visibility, activation/download, catalog-carried pricing inputs, media/content references, import processing, and audit history. It must not make accessory-specific compatibility rules vague just to support merchandise.

Non-accessory branded merchandise should not become a separate bounded context yet. Track a future Branded Merchandise Catalog only if volume, legal licensing complexity, category-specific workflows, buyer-specific storefront behavior, fulfillment complexity, or operational ownership grows beyond Product Catalog's controlled extension model.

## Core Concepts

These concepts are proposal-level. They do not finalize data model, schema syntax, API contracts, validation rules, or business behavior.

### Product Type

A classification that determines the high-level product model and validation family.

Examples:

- Accessory.
- Apparel.
- Branded Merchandise.
- Licensed Merchandise.
- Future product type placeholder.

Accessory should remain the default and core Product Type for CIXCI's current business model.

### Product Type Profile

Defines proposal-level behavior for a Product Type.

A Product Type Profile may describe:

- Required product-level field groups.
- Allowed variant model.
- Whether Device Reference compatibility is required, optional, forbidden, or merchandising-only.
- Media readiness requirements.
- Licensing metadata requirements.
- Fulfillment fact requirements.
- Allowed import modes and validation rules.
- Event and audit requirements.

### Product Type Capability Profile

Defines which Product Catalog capabilities apply to a Product Type.

Examples:

- Supports Device Reference compatibility.
- Supports buyer activation/download.
- Supports apparel size variants.
- Supports licensed metadata.
- Supports buyer export.
- Supports media rendition requirements.
- Supports catalog-carried pricing inputs.
- Supports stop-sell/deactivation records.

Capability profiles should prevent Product Catalog from assuming every product type needs every capability.

### Attribute Schema

Defines product-level attributes for a Product Type, category, or validation profile.

Examples:

- Material.
- Brand.
- League.
- Team.
- Licensed property.
- Age group.
- Care instructions.
- Fit.

Attribute Schema should not replace Product Category or Product Taxonomy Node. Category describes placement; schema describes fields and validation.

### Product Attribute Set

A set of Attribute Values attached to a product record according to an Attribute Schema.

Product Attribute Set may contain category-specific product facts such as material, team, league, licensed property, care instructions, and other branded-product metadata.

### Variant Schema

Defines variant-level attributes and allowed variant structures for a Product Type or category.

Examples:

- Apparel size.
- Color.
- Fit.
- Style.
- Pack size.
- Connector type for accessories.

Variant Schema should distinguish variant identity from vendor SKU identity.

### Variant Attribute Set

A set of Attribute Values attached to a product variant according to a Variant Schema.

Examples:

- Size = Large.
- Color = Navy.
- Material = Cotton blend.
- Fit = Unisex.

### Category Validation Profile

Defines category-specific required fields, optional fields, validation constraints, and blocking behavior.

Category Validation Profile may depend on Product Type, Product Category, Product Taxonomy Node, Attribute Schema, Variant Schema, and Product Type Capability Profile.

Product Category alone must not carry validation behavior. Validation should be driven by Product Type + Category Validation Profile + Attribute Schema.

### Attribute Definition

Defines a reusable attribute, including name, data type, allowed values, units, source, validation behavior, and ownership notes.

Examples:

- Size.
- Color.
- Material.
- Team.
- League.
- Licensed property.
- Care instruction.
- Compatibility marker.

### Attribute Value

Stores the actual value for a product or variant under an Attribute Definition.

Attribute Values should preserve source, normalization, version, validation status, and audit references where needed.

### Licensed Product Metadata

Placeholder metadata for licensed or branded products.

Examples:

- License owner reference.
- Licensed property reference.
- Team or league reference.
- Territory placeholder.
- Approval state placeholder.
- Expiration placeholder.
- Usage constraints placeholder.

Product Catalog may store licensed metadata placeholders and references, but must not own full legal licensing workflow unless a future Licensing Management context is created.

### Brand / Licensed Property Reference

A reference to the brand, team, league, collection, or other licensed property associated with a product.

Examples:

- Team reference.
- League reference.
- Brand reference.
- Event or collection reference.

This should remain a reference or placeholder until ownership of brand/licensing source-of-truth is assigned.

## Compatibility Rule

Device Reference compatibility remains required only for product types and categories that need it.

- Accessories may require Compatible Device Reference.
- Apparel and branded merchandise should not require Device Reference unless explicitly configured for merchandising context.
- Product Catalog must not weaken accessory compatibility rules just to support merchandise.
- A Product Type Profile or Category Validation Profile should declare whether Device Reference compatibility is required, optional, forbidden, or merchandising-only.
- Merchandising context references must not be treated as compatibility assertions.
- Product Catalog should continue to reference Device Catalog records through Device Reference or Compatible Device Reference values rather than copying canonical Device data.

## Accessory-First Guardrails

- Accessory remains the default and core product type.
- Device compatibility remains accessory-focused.
- Branded merchandise is optional and type-controlled.
- Apparel fields must not be added directly to every product or variant.
- Product Category alone must not carry validation behavior.
- Validation must be driven by Product Type + Category Validation Profile + Attribute Schema.
- Product Type support should not force every buyer, vendor, integration, import, API, or downstream consumer to handle apparel-specific fields.
- Accessory import and API validation must stay strict for compatibility, Device References, and accessory-specific required fields.
- Branded merchandise support should be additive and isolated through type-aware validation.
- Product Catalog must not become a general retail operating system.

## Branded Merchandise Examples

Proposal-level examples of optional non-accessory product types or categories include:

- Hats.
- Shirts.
- Sweatshirts.
- Jerseys.
- Sweatpants.
- Licensed team products.
- Licensed league products.
- Branded retailer merchandise.

These examples do not finalize category taxonomy, required fields, licensing workflow, media requirements, or fulfillment behavior.

## Licensing And Branded-Product Boundaries

Product Catalog may store licensed metadata placeholders and product references needed to describe branded merchandise.

Product Catalog must not own full legal licensing workflow unless a future Licensing Management context is created.

Boundary rules:

- Product Catalog owns product records, product type, product attributes, variant attributes, taxonomy assignment, product lifecycle, publication, visibility, activation/download, catalog-carried pricing inputs, media/content references, import processing, and audit history for catalog records.
- Product Catalog may store Brand / Licensed Property References and Licensed Product Metadata placeholders.
- Licensing Management, if introduced, should own license agreements, legal approval workflow, rights clearance, territory rules, expiration governance, and licensing audit beyond catalog placeholders.
- Media Asset Management may own image, rendition, rights, licensing metadata, transformation, CDN, and publishing workflows if introduced.
- Pricing owns pricing interpretation, calculation, discounts, promotions, exceptions, overrides, effective prices, snapshots, and pricing audit.
- Fulfillment owns fulfillment execution, shipment, return, fulfillment exceptions, and operational status.
- Tenant Company owns buyer/vendor eligibility, relationship scope, geography eligibility, readiness, roles, permissions, and tenant hierarchy.
- AI Agent Services may consume branded-product signals and produce recommendations, but does not own Product Catalog source records, licensing records, pricing, fulfillment, media rights, or tenant eligibility.

## Import / API Validation Impact

Every import or API product record should declare Product Type.

Proposal-level validation rules:

- Product Type determines required field groups.
- Product Type Capability Profile determines which Product Catalog capabilities are enabled for the record.
- Category Validation Profile determines category-specific required fields.
- Attribute Schema determines product-level attribute validation.
- Variant Schema determines variant-level attribute validation.
- Accessory validation checks Device References where required.
- Apparel/branded merchandise validation checks size, color, material, licensing, media, and category-specific requirements where configured.
- Import errors should include product type, category, attribute path, validation profile version, and blocking state.
- Import errors should distinguish missing required type fields from missing required category fields.
- API responses should not force apparel/branded merchandise fields into accessory products unless explicitly requested or applicable.
- Versioning should account for changes to Product Type Profiles, Attribute Schemas, Variant Schemas, and Category Validation Profiles.

## Future Context Watchlist

The following possible future contexts should be watched but not created yet unless complexity or volume justifies them.

### Branded Merchandise Catalog

Consider only if branded merchandise develops independent ownership, high volume, category-specific operations, storefront behavior, licensing complexity, or workflows that are too broad for Product Catalog's type-controlled extension model.

### Licensing Management

Consider if legal agreements, rights clearance, territories, expiration governance, approval workflows, royalty rules, or licensing compliance become first-class operational workflows.

### Media Asset Management

Consider if source assets, renditions, transformations, rights, localization, CDN behavior, publishing approvals, and syndication need dedicated platform ownership.

### Campaign / Launch Event Management

Consider if promotions, campaigns, product launches, seasonal events, team drops, retail activations, or launch readiness become operational workflows beyond Product Catalog lifecycle/publication records.

## Impacts

Future Product Catalog refinements should add proposal-level support for:

- Product Type.
- Product Type Profile.
- Product Type Capability Profile.
- Attribute Schema.
- Product Attribute Set.
- Variant Schema.
- Variant Attribute Set.
- Category Validation Profile.
- Attribute Definition.
- Attribute Value.
- Licensed Product Metadata.
- Brand / Licensed Property Reference.
- Type-aware import/API validation.
- Device Reference compatibility rules by Product Type and Category Validation Profile.
- Accessory vs apparel/branded merchandise test scenarios.

Future Product Catalog updates should revise language that assumes every Product Catalog record is an accessory, while preserving accessory-first scope and guardrails.

This ADR does not require immediate changes to Product Catalog, Device Catalog, Pricing, Tenant Company, AI Agent Services, or any module files.

## Open Questions

- Which Product Types should be supported first beyond Accessory?
- Which buyers are allowed to use non-accessory product types?
- Which Product Type Profiles require CIXCI approval before activation?
- Which Product Categories require licensing metadata?
- Which Product Types require media readiness before visibility or export?
- Which Attribute Definitions are global, product-type-specific, category-specific, vendor-owned, CIXCI-governed, or buyer-specific?
- Which branded merchandise fields are source-of-truth product facts versus buyer-facing merchandising content?
- When does branded merchandise volume justify a separate Branded Merchandise Catalog?
- When does licensing complexity justify a separate Licensing Management context?

## Consequences

- Product Catalog can support optional non-accessory branded products without abandoning the accessory-first model.
- Accessory compatibility rules remain strong and explicit.
- Apparel and branded merchandise fields can be modeled without polluting every product and variant record.
- Product Category remains taxonomy, while validation behavior is owned by explicit Product Type, Category Validation Profile, and schema concepts.
- Future module work can add type-aware validation, imports, API contracts, and test scenarios without prematurely creating a branded merchandise module.
- Future complexity thresholds remain visible so Product Catalog does not quietly become an unbounded general commerce catalog.
