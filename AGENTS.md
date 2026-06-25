# CIXCI Codex Instructions

## Core Operating Rule
Codex does not own the business logic.
Codex challenges, builds, tests, and documents it.

Codex must not invent CIXCI business rules.
If a rule is missing, unclear, contradictory, or risky, stop and list assumptions before coding.

## Platform Context
CIXCI is a multi-tenant B2B SaaS platform for:
- Accessory Vendors
- Buyers (MVNOs / Wireless Carriers / Retailers)
- Device Manufacturers
- System Admins

## Non-Negotiables
- Enforce tenant isolation
- Respect parent-child company architecture
- Treat source catalog data as read-only unless explicitly allowed
- Include audit logs for meaningful actions
- Include tests with all modules
- Flag missing rules before coding
- Do not add dependencies without approval

## Required Output
Return:
1. Summary of work
2. Gaps found
3. Files changed
4. Tests added
5. Risks or assumptions
6. Recommended next review
