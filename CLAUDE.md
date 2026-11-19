# CIXCI agent entry point

@AGENTS.md

Follow [AGENTS.md](AGENTS.md) as the canonical instructions, including the CIXCI
business-rule ownership, tenant isolation and dependency-approval requirements.

At session start or after context loss, read only the startup set first:
[CURRENT_STATE](docs/ai-context/CURRENT_STATE.md),
[SESSION_HANDOFF](docs/ai-context/SESSION_HANDOFF.md),
[TASKS](docs/ai-context/TASKS.md), then inspect Git status and relevant source.

Use [FEATURE_REGISTRY](docs/ai-context/FEATURE_REGISTRY.md) and
[CODEBASE_MAP](docs/ai-context/CODEBASE_MAP.md) to select module guides, rules and
decisions. Do not automatically import the entire memory directory. Documentation
maintenance and verification are part of implementation, not an optional handoff.
