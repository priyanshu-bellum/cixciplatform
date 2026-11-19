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

## Persistent Repository Memory (All Coding Agents)
Applies to Codex, Claude Code, Cursor and other agents working here. This file is
the canonical agent workflow. Preserve applicable nested instructions. Memory is
under `docs/ai-context/`; load only the startup set and task-relevant records.
Architecture decisions remain canonical in `architecture/` (ADR-0002); existing
`modules/` specifications describe intended design, not proof of implementation.

### Session Initialization and Recovery
1. Read applicable instructions, then [CURRENT_STATE](docs/ai-context/CURRENT_STATE.md),
   [SESSION_HANDOFF](docs/ai-context/SESSION_HANDOFF.md) and [TASKS](docs/ai-context/TASKS.md).
2. Inspect `git status --short`, branch/HEAD and relevant diffs; preserve unrelated
   uncommitted work. Never rely only on conversation history or documentation.
3. Identify affected feature IDs in [FEATURE_REGISTRY](docs/ai-context/FEATURE_REGISTRY.md)
   and read relevant module guides, [business rules](docs/ai-context/BUSINESS_RULES.md)
   and [decision index](docs/ai-context/DECISIONS.md). Use the
   [codebase map](docs/ai-context/CODEBASE_MAP.md) for navigation.
4. Inspect actual source, callers, consumers, tests and schema definitions. Reconcile
   discrepancies explicitly before editing. After compaction/restart/clear, repeat
   these steps, identify the active task and resume the recorded checkpoint without
   repeating completed work or overwriting it.

### Before and During Changes
- Establish acceptance criteria, affected files/features/dependencies and regression
  risks. Check existing implementations and public contracts before adding code.
- Create/update a stable TASK-NNN record and a concise implementation plan. If
  requirements conflict with approved business rules, stop the conflicting work,
  list assumptions and request clarification; do not invent a rule.
- Follow existing patterns, preserve required compatibility and make targeted
  changes. Avoid duplicate implementations, unrelated refactoring and whole-module
  rewrites when a small change suffices. Dependencies still require approval.
- Persist discoveries, decisions, task progress and exact next steps at meaningful
  checkpoints, including before risky operations or context loss. Critical context
  must not exist only in conversation. Keep current state/handoff compact.
- Bug fixes must identify the feature and root cause, trace the full affected flow
  and downstream effects, make the smallest maintainable repair, add regression
  coverage where possible and verify related behavior. Do not hide symptoms.

### Completion and Documentation Integrity
Before marking a task complete:
1. Review the full diff and affected consumers/dependencies; preserve user changes.
2. Run relevant tests/type/lint/build checks available for the change; include module
   tests and regression coverage where appropriate. Record commands, real results
   and limitations. Never report an unexecuted/failed check as passing.
3. Update affected module guides and feature entries; API/schema/rules/decisions
   only when affected and authorized. Update CHANGELOG, CURRENT_STATE, TASKS and
   SESSION_HANDOFF; record remaining work and uncommitted changes.
4. Run `node scripts/validate-ai-context.mjs` for memory integrity. For API/schema
   changes use a fresh read-only inventory as described in
   [VERIFICATION](docs/ai-context/VERIFICATION.md). This is an agent completion gate;
   it does not prove application tests or live deployment health.

Source code, verified tests and schema definitions are evidence of implementation;
explicit user requirements and approved rules define intended behavior. Mark
unknown, inferred, unverified or outdated claims. Investigate contradictions rather
than silently changing behavior or assuming either document is approved policy.
Update only affected records; do not regenerate all memory for small changes.
Keep history in CHANGELOG/DECISIONS; never recycle feature/rule/task/issue IDs or
mark an issue resolved before its fix is verified.

### Security and Operational Safety
- Never document secret values, credentials, tokens or customer record dumps.
- Never delete unrelated files/user work, discard work with destructive Git commands,
  or execute destructive production operations without explicit authorization.
- Analyze migrations and compatibility before schema changes; verify the target
  database before running migrations, seeds, exports or background workers.
- Never automatically commit or push unless explicitly requested.
