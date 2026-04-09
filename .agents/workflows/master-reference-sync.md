---
trigger: always_on
---

# Corporate Memory Synchronization Rule

Whenever you solve a complex bug, establish a new architectural pattern, modify the Supabase database schema, or reverse-engineer hardware payloads, you MUST document these findings in the Master Reference to build long-term corporate memory.

1. **Primary Reference**: `.agents/workflows/master_reference.md` (Hardware protocols, DB schemas, architecture, core hooks).

### Important: Keeping the Reference Clean
To prevent the Master Reference from filling up with duplicates and junk:
- **Search Before Write**: NEVER blindly append to the end of the document. You must search the document first to see if the topic (e.g. `0x51 Payload` or `Users Table`) already exists.
- **Update, Don't Duplicate**: If the topic exists, securely *edit* that exact section rather than creating a secondary entry.
- **Strict Headers**: Place your findings strictly under the appropriate structured Markdown heading (e.g., `## BLE Protocols`, `## Database Schemas`, `## Context Providers`).
- **Prune Old Assumptions**: If your new discovery proves an old note wrong, delete the old incorrect assumption from the reference file entirely.
