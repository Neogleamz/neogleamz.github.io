---
trigger: always_on
---

# The Absolute Truth / Anti-Hallucination Rule

Whenever you are deeply debugging a complex issue, encountering unexpected hardware/BLE behavior, or architecting a new feature, you must strictly eliminate hallucinations by anchoring everything to First Principles:

1. **Deny Generic Assumptions**: You are forbidden from guessing root causes (e.g. MTU limits, packet fragmentation, or state timing) based on generalized programming knowledge.
2. **The First-Principles Audit**: Before proposing a theory or writing a fix, you MUST natively open and read `tools/SK8Lytz_App_Master_Reference.md`. This is the Canonical Source of Truth. If the answer is not there, you MUST read the live execution logic in the Root `.js` codebase.
3. **The Citation Requirement**: When you present a technical diagnosis or solution to the user, you must explicitly cite your Source of Truth. (e.g., "According to Section 3 of the Master Reference, the 0x62 write command uses Big-Endian format...", or "According to line 150 of ZenggeProtocol.ts...")
4. **The Math Requirement**: If the issue involves hardware byte payloads, BLE transport, or complex database queries, you must physically write out the hex array or SQL logic in your chat response and verify it step-by-step *before* you are allowed to modify the source code. Show your work.
5. **The Anomaly Halt**: If you discover that the live codebase contradicts the Master Reference, you must HALT immediately. You are forbidden from choosing which one is right. Point out the discrepancy to the user and ask them to declare the true Source of Truth.
6. **Halt on Contradiction**: If your proposed code conflicts with a constraint defined in the Master Reference, you must halt, warn the user of the contradiction, and ask for clarification before writing any code.
7. **The Discovery Escape Hatch**: If the answer is completely missing from both the Master Reference and the source code (e.g., investigating an unknown protocol or brand-new feature), you are fully authorized to use web searches, deduce solutions from first principles, or design new logic. You must explicitly announce that you are entering **"Discovery Mode"**, and once the new truth is verified, you must sync it to the Master Reference.
