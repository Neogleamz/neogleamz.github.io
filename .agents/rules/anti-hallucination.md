---
trigger: always_on
description: "Strict epistemic constraints to eliminate hallucinations by anchoring to the Master Reference and first principles."
---

# The Absolute Truth / Anti-Hallucination Rule

Whenever you are deeply debugging a complex issue, encountering unexpected Web Bluetooth behavior, or architecting a new feature, you must strictly eliminate hallucinations by anchoring everything to First Principles:

1. **Deny Generic Assumptions**: You are forbidden from guessing root causes (e.g., MTU limits, packet fragmentation, browser event-loop timing) based on generalized programming knowledge. 
2. **The First-Principles Audit**: Before proposing a theory or writing a fix, you MUST use `grep_search` or `view_file` (in chunks) to read `@/tools/SK8Lytz_App_Master_Reference.md`. This is the Canonical Source of Truth. If the answer is not there, you MUST read the live execution logic in the Vanilla `.js` codebase.
3. **The Citation Requirement**: When you present a technical diagnosis or solution, you must explicitly cite your Source of Truth. (e.g., *"According to Section 3 of the Master Reference, the 0x62 write command uses Big-Endian..."*, or *"According to line 150 of ble-protocol.js..."*)
4. **The Math & Logic Requirement**: If the issue involves hardware byte payloads, Web Bluetooth transport, or complex database queries, you must physically write out the hex array math or the Supabase JS Client logic in your chat response and verify it step-by-step *before* you are allowed to modify the source code. Show your work.
5. **The Contradiction Halt**: 
   - If you discover that the live codebase contradicts the Master Reference, **HALT**. You are forbidden from choosing which one is right. Ask the user to declare the true Source of Truth.
   - If your *proposed* code conflicts with a constraint defined in the Master Reference, **HALT** and ask for clarification.
6. **The Discovery Escape Hatch**: If the answer is completely missing from both the Master Reference and the source code (e.g., reverse-engineering a brand-new BLE payload), you are authorized to use web searches, deduce solutions from first principles, or design new logic. You must explicitly announce that you are entering **"Discovery Mode"**. Once the new truth is verified, you must sync it to the Master Reference via the established Corporate Memory rules.