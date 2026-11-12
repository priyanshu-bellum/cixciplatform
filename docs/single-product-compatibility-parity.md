# Single-product form and bulk compatibility parity

## Source and plan

Follow `bugs/CIXCI_Universal_Device_Type_Compatibility_Developer_Requirement_v1.0.docx`
sections 3–5 and 9, together with the category configuration requirement sections
3, 5 and 7. Inspect the single-product form, its actual request and the shared
backend contract; correct UI gaps and verify equivalent manual/CSV submissions.
No new matching method or supplier-specific exception is introduced.

## Entry flow

| Category method | Single-product modal | Bulk CSV | Structured create/update |
| --- | --- | --- | --- |
| Device Specific | Search and select exact canonical models | Device Compatibility: canonical model IDs or unambiguous approved names | `device_ids`, `compatibility_mode=direct_device` |
| Universal | Select approved Device Types, without model selection | Quoted `"Universal, Phone, Tablet"`, or Universal Device Types column | `compatible_device_types`: canonical type IDs, `compatibility_mode=universal_device_type` |
| Feature Based | Category-assigned capability controls | Corresponding compatibility columns | Configured capability fields |
| Hybrid | Exact model selector plus configured capability controls | Exact models and capability columns | `device_ids` plus capability fields; effective results use OR |

Product category configuration supplies the default compatibility controls.
The latest user clarification supersedes the earlier category/method equality
requirement: an explicit Product Universal declaration is valid under an existing
business category. The modal's Product Compatibility selector, CSV parser and
structured API use the same declaration. Product Category is preserved; no
Universal Accessories category is created or auto-selected.
Universal declarations contain approved type IDs; the declared scope and
current category/device eligibility remain separate. Eligibility changes must
not silently expand or rewrite a saved Universal declaration. Exclusions and
completed export history retain their existing rules.

## Gaps corrected

- The exact-model dropdown stopped at 50 rows. It now renders a bounded initial
  page and provides Show more, while search examines the full loaded model set.
- Model search/display used `brand` and `model`, although the Device API supplies
  `manufacturer_name` and `model_number`. Both canonical fields now participate.
- Exact-model choices previously included types rejected by the shared backend
  category validator. They now follow the category's saved eligible IDs, with
  legacy code compatibility and authoritative `_eligible_type_ids` metadata.
- Universal toggling now normalizes mirrored codes to canonical IDs, so an old
  saved code can be unchecked without retaining an unintended duplicate scope.
- The modal explains the selected category method. Existing unavailable type
  references remain visible for review instead of disappearing from the form.
- Selected-model lookup uses an ID map rather than repeated linear searches.
- A previously saved model missing from a Vendor's current list is preserved;
  absence from that UI list does not manufacture a category mismatch. Canonical
  selection validation remains on the shared backend command.

No schema or data migration is required: these changes correct form behavior and
add regression coverage. They do not mutate source products during verification.
The existing catalog-wide model fetch remains unchanged; rendered suggestions
start at 50 and increase only on request.

## Verification

The full suite passes 355 tests on SQLite and the same 355 on PostgreSQL.
The browser suite passes 33/33 checks; TypeScript/Vite production build passes.
Detailed results are recorded in `compatibility-verification-checklist.md`.
New browser fixtures intercept every product mutation, verify actual submitted
payloads, exercise a 75-model approved list plus a disallowed Tablet, search by
model number, and inspect Universal/Hybrid/Feature Based controls. Isolated
backend regressions compare JSON and quoted CSV declarations for all three
current types, reject category-ineligible exact selections atomically, and
deduplicate Universal scope without creating individual-model declarations.

## Remaining boundaries

Universal compatibility alone does not grant Buyer visibility: current portfolio,
catalog readiness and the independently configured commercial gates still apply.
Vendor API onboarding and supplier routing are the separate next phase in
`onboarding-and-vendor-integration-plan.md`; this form correction does not claim
that phase is implemented.

## Dropdown management follow-up

User reported saved Manufacturer names and Device Compatibility Rules were hard
to find, and explicitly required preserving Product Manage Dropdown behavior.
The shared compatibility-values editor had been inserted above both existing
managers; its height crowded the original controls and list.

- Remove the duplicate shared editor from Product Manage Dropdown. Preserve its
  original Category/System Color tabs, add/delete controls and category-specific
  Configure Compatibility action. Retain the documented canonical values and
  validation fixes; restoring mismatched rule values would break mapping.
- Device Manage Dropdown opens on Device Manufacturers, with separate direct
  Device Types & Compatibility Rules and Admin Compatibility Values tabs.
- Use a named Configure Rules button on each Device Type. Existing entry modes,
  category configuration and auto-mapping controls stay in the same modal.
- Manufacturer/type definitions use the supported `paginate=false` contract;
  the previous `limit=100` parameter did not override cursor pagination.
- Preserve a readable list height, await the post-save refresh, return the list
  to its newest entries, and prevent repeated submissions while adding a value.
- Browser fixtures exercise a 60-manufacturer list, creation/refetch, visible
  saved name, deactivation, rules access, shared values access and the original
  Product manager layout. All fixture mutations are intercepted.

No manufacturer, product, rules configuration or source catalog record is added
or edited by these browser checks. No matching policy changes accompany this
management-layout correction.
