---
model: sonnet
description: Triggers whenever the user wants to dispatch a swarm or subagent via [/teamwork-preview]. Enforces the Swarm Lock Ledger Protocol before dispatch. (triggers: /teamwork-preview)
---

# Teamwork Preview Workflow

When the user invokes `[/teamwork-preview]`, you are acting as the Lead Orchestrator deploying a team of autonomous subagents. You MUST execute the following sequence perfectly to prevent Phantom Swarms:

### 1. The Swarm Lock (CRITICAL GATE)
Before you invoke any subagents using the `invoke_subagent` tool, you **MUST** physically write them into the Bucket List.
- Open `@tools/SK8Lytz_Bucket_List.md`.
- Inject the exact swarm names and their goals under the `🟠 P1 High Priority` queue.
- Use the `[/]` (In Progress) token. E.g., `- [/] feat/feature-name : **Feature Name** - Description.`
- **HALT CHECK:** If you have not successfully modified the Markdown file and verified the changes, you are STRICTLY FORBIDDEN from calling the `invoke_subagent` tool.

### 2. Dispatch
- After the Swarm Lock is visually established in the file, use your subagent tool to launch the swarms into the background.
- **Standard Subagent Roster (pinned models):** prefer the named agents in `.claude/agents/` — each carries its own model tier, so do not pass a `model` override unless escalating:
  - `explore-mapper` (haiku) — read-only touch-point mapping
  - `test-lint-runner` (haiku) — runs `npm test` + `npx eslint .`
  - `security-scout` (sonnet) — enumerates XSS violations via `scripts/xss-audit.js`
  - `implementation-planner` (sonnet) — writes plans to `docs/plans/`
  - `xss-validator` (sonnet) — before/after XSS diff
  - `test-guide-generator` (sonnet) — manual testing guides
  - `implementer` (sonnet; `model: opus` override for security-critical files) — executes an approved plan
  - For deep adversarial scans, invoke `/red_team` (opus) rather than a generic agent.

### 3. Confirmation
- Once launched, confirm to the user using standard markdown (not plain text).
- Use a `> [!NOTE]` block to confirm that the swarms have been successfully added to the `SK8Lytz_Bucket_List.md` as `[/]`.
- Use a `> [!TIP]` block to inform the user that the system will automatically notify you when the swarms finish, and suggest `/wind_down` if they want to leave them running.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks. ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).

Every model (Claude, Gemini, GPT) must produce this exact structure when dispatching a swarm:

### 🤖 Teamwork Swarms Dispatched

| Gate | Result | Detail |
|---|---|---|
| 📋 Swarm Lock | ✅ | Injected `[/]` tasks into `SK8Lytz_Bucket_List.md` |
| 🚀 Dispatch | ✅ | `invoke_subagent` executed successfully |

> [!NOTE]
> **Ledger Synchronized**
> The active swarms have been safely logged into the active queue to prevent Phantom Swarm corruption.

> [!TIP]
> **Background Execution**
> The swarms are now running autonomously. I will receive a ping when they complete. We can continue working on other tasks or execute `[/wind_down]`.
