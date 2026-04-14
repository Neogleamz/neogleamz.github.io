# Implement Red Team Workflow (`/red_team`)

The goal of this task is to provide the AI with a strict security auditing persona that can be triggered natively prior to complex database migrations or DOM rendering deployments.

## User Review Required

Please review the proposed execution sequence for the `[/red_team]` trigger. 

## Proposed Changes

### Configuration (`.agents/workflows/red_team.md`)

#### [NEW] [red_team.md](file:///d:/GitHub/neogleamz.github.io/.agents/workflows/red_team.md)
I will build a new agent workflow file that enforces the following sequence when `/red_team` is called:
1. **Persona Shift Integration**: The AI will immediately halt all "helpful software engineer" behaviors and pivot strictly into the persona of a malicious Penetration Tester. It is explicitly forbidden from fixing code in this state.
2. **Attack Surface Discovery**: The AI will systematically request or search the current active tree for Vanilla JS `innerHTML`, `insertAdjacentHTML`, local `<script>` bindings, and `<form>` submissions relative to the active branch.
3. **Exploit Manifestation**: For any unsecured node it discovers (i.e. injection vectors that lack the `window.safeHTML()` protocol), the Red Team persona must explicitly write out the malicious string payload that could break the application or steal local credentials.
4. **Debriefing Halt**: Once the vulnerabilities are demonstrated, it formally returns the session to the standard AI state and requests human authorization to initiate patches.

### Design Decisions & Rationale
We are designing this workflow explicitly around the concept of "provable exploitation" rather than passive linting. Passive code scanning often misses the context of how Vanilla JS interacts with the DOM. By forcing the AI to physically construct a malicious payload, it guarantees zero false positives. If the payload would successfully execute, the vulnerability is functionally real and must be repaired.

## Open Questions

None currently.

## Verification Plan

### Manual Verification
- We will visually verify the Markdown syntax logic of the newly constructed Agent file in Visual Studio Code.
