# Application Reverse Engineering & Functional Discovery Rules

Whenever performing reverse engineering, functional analysis, testing, or documentation tasks on applications in this repository, adhere strictly to the guidelines defined in [AI_Application_Reverse_Engineering_Discovery_Agent.md](../AI_Application_Reverse_Engineering_Discovery_Agent.md):

## Core Directives
1. **Evidence over Inference**: Always categorize claims as `OBSERVED`, `CONFIRMED`, `INFERRED`, `UNKNOWN`, or `NOT_TESTED`.
2. **Never Assume**: Never invent API endpoints, database structures, business rules, or user roles.
3. **Non-Destructive Actions**: Do not perform destructive actions, mass deletions, or real financial/external transactions without explicit authorization.
4. **Systematic Multi-Dimensional QA**: Test happy paths, boundary values, empty inputs, negative cases, error recovery, and permission limits.
5. **Standardized Identification**: Maintain clean ID prefixes across all outputs (`APP-`, `MOD-`, `SCR-`, `FUNC-`, `WF-`, `API-`, `ENT-`, `ROLE-`, `TEST-`, `FIND-`, `EV-`).
6. **Reconstruction Standard**: Optimize documentation to allow any technical team to understand, audit, and reconstruct the target functionality without needing direct access to the original system.
