---
name: app-reverse-engineer
description: >-
  Use this skill to execute functional reverse engineering, comprehensive application discovery,
  systematic QA, UX/security review, API/entity extraction, and specification drafting for existing web applications.
---

# AI Application Reverse Engineering & Functional Discovery Agent

This skill guides the agent through systematic functional reverse engineering and behavioral discovery of web applications based on the blueprint in [AI_Application_Reverse_Engineering_Discovery_Agent.md](../../AI_Application_Reverse_Engineering_Discovery_Agent.md).

## Investigation Framework & Execution Workflow

Follow the 12 phases systematically:

1. **Phase 0: Scope & Authorization**
   - Confirm target URLs, environment (staging/lab/prod), credentials, test data boundaries, and prohibited actions.
   - If critical information is missing, mark as `BLOCKED / NEEDS INPUT`.

2. **Phase 1: Application Reconnaissance**
   - Traverse and catalog landing pages, authentication routes, primary/secondary navigation menus, dashboards, and role portals.
   - Output: `application/application-map.md`.

3. **Phase 2 & 3: Screen & Component Inventories**
   - Deconstruct each screen into unique screen IDs (`SCR-001`), layout sections, forms, tables, modals, action triggers, and state containers.
   - Output: `screens/SCR-xxx.md`.

4. **Phase 4 & 5: Function Discovery & Systematic QA**
   - For every interactive element, record preconditions, execution steps, expected vs. observed results, state transitions, and API calls.
   - Test across 12 standard dimensions: valid, empty, invalid, boundary, duplicate, unexpected types, permission limits, error states, retries, refresh behavior, back navigation, and concurrency.
   - Output: `functions/FUNC-xxx.md` and `tests/test-cases.md`.

5. **Phase 6: End-to-End Workflow Discovery**
   - Map business workflows (`WF-001`) from triggers to final states including multi-screen progressions, notifications, state changes, and failure paths.
   - Output: `workflows/WF-xxx.md`.

6. **Phase 7 & 8: Entity & API Discovery**
   - Catalog data entities (`ENT-001`), observable fields, data types, validation constraints, lifecycle states, and CRUD associations.
   - Catalog network requests (`API-001`), methods, endpoints, parameters, payloads, response status codes, and error formats.
   - Output: `entities/ENT-xxx.md` and `apis/api-inventory.md`.

7. **Phase 9 & 10: Security & UX Assessment**
   - Conduct non-destructive defensive security assessments (OWASP categories, auth checks, session handling, token/cookie storage, RBAC validation).
   - Evaluate UX/UI consistency, feedback states, responsiveness, and accessibility observations.
   - Output: `security/findings.md` and `ux/findings.md`.

8. **Phase 11: Coverage & Synthesis**
   - Compute exact discovery vs. tested metrics across screens, functions, roles, workflows, and APIs.
   - Generate `reports/final-report.md` fulfilling the golden reconstruction criterion: *"Can another developer implement this feature using only this documentation?"*

## Evidence Classification Standard

Tag all facts according to confidence level:
- `OBSERVED`: Directly seen in DOM, UI, network traffic, or console output.
- `CONFIRMED`: Verified through repeated or multi-step testing.
- `INFERRED`: Reasonably deduced from observed patterns.
- `UNKNOWN`: Unverified or inaccessible.
- `NOT_TESTED`: Identified but not yet validated.
