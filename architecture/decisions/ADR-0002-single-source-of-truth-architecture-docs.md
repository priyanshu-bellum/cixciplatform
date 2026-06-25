# ADR-0002: Single Source of Truth for Architecture Docs

## Status
Accepted

## Context
Platform-wide architecture guidance needs one canonical location. If the same guidance appears in both root architecture documentation and module folders, future reviews may produce duplicate or conflicting recommendations.

## Decision
Platform-wide architecture documentation lives only under `/architecture`.

Module folders should contain domain-specific module specifications, data models, workflows, edge cases, test scenarios, assumptions, and open questions for that module only.

Future Codex reviews should treat `/architecture` as the canonical source for platform-wide decisions and guidance.

## Consequences
- `/architecture` is the single source of truth for cross-module architecture guidance.
- Module folders stay focused on module-specific domain behavior.
- Duplicate or conflicting architecture guidance is easier to detect and remove.
- Future reviews have a clear place to check before proposing platform-wide architecture changes.
