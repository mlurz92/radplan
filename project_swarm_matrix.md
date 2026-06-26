# Swarm Project Matrix: RadPlan-Optimizer

> **Commander's Note:** This file is the Single Source of Truth (SSOT). Always run `python "C:\Users\marku\.gemini\config\skills\swarm-commander\scripts\swarm_cli.py" sync` after making any edits to propagate changes to the database.

## 1. Project Goal & Architecture
**Objective:** Audit the RadPlan codebase to find concrete optimization opportunities in UI/UX/architecture, scheduling algorithm rules/performance, and test coverage/robustness.
**MECE Guarantee:** Tasks are divided by codebase domain: frontend styling/layout (TSK-01), mathematical/rule scheduling algorithm (TSK-02), and code reliability/test engineering (TSK-03).

## 2. Agent Roster (Live Tracking)
*Update this table, then run `swarm_cli.py sync` to propagate changes to the JSON state.*

| Agent UUID | Persona | Status | Workspace | Allowed Context (Paths) | Memory Refresh Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `41ca6824-77dc-4d09-a8a0-22a53c13dbdb` | `Frontend_Architect_Elite` | COMPLETED | `inherit` | `[/css/, /js/render-*, /index.html]` | None required |
| `228a4963-bfce-422b-9313-d091c6a23bd9` | `Mathematical_Algorithm_Genius` | COMPLETED | `inherit` | `[/js/autoplan.js, /js/constants.js]` | None required |
| `65bb3169-e7bd-450d-b88f-95c4d138f1fc` | `QA_Security_Auditor` | COMPLETED | `inherit` | `[/test/, /js/state.js, /functions/api.js]` | None required |

## 3. MECE Execution Graph
*Strict dependency tracking and complexity scoring.*

| Task ID | Description (MECE) | Assigned Persona | Depends On | Complexity (1-10) | Target Paths | Fallback / Escalation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TSK-01 | Audit UI/UX, CSS styling structure, responsive layout, and frontend component modularity | Frontend_Architect_Elite | None | 5 | `[/css/, /js/render-*, /index.html]` | Escalate to Commander | COMPLETED |
| TSK-02 | Audit scheduling logic, constraint propagation, fairness optimization formulas, and solver scalability | Mathematical_Algorithm_Genius | None | 7 | `[/js/autoplan.js, /js/constants.js]` | Escalate to Commander | COMPLETED |
| TSK-03 | Audit test setup, identify edge case reliability, fix the history test suite regression, and check Cloudflare function API.js security | QA_Security_Auditor | None | 6 | `[/test/, /js/state.js, /functions/api.js]` | Escalate to Commander | COMPLETED |

## 4. Final Quality Audit Protocol
| Auditor Persona | Verification Criteria | Status |
| :--- | :--- | :--- |
| `Executive_Editor_QA` | Ensure recommendations are clear, structured, actionable, and address the whole codebase | PENDING |
