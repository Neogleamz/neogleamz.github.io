---
name: master_reference_sync
description: "Strict constraints for updating and maintaining corporate memory documents without duplication or data loss."
trigger: always_on
---

# Corporate Memory Synchronization Rule

Whenever you are instructed (e.g., via the Midnight Oil or Ship It workflows) to document a complex bug fix, architectural pattern, DB schema, or hardware payload, you MUST adhere to these documentation standards:

1. **Primary Reference**: `@/tools/SK8Lytz_App_Master_Reference.md` (Hardware protocols, DB schemas, Vanilla JS architecture, core modules).
2. **Assets Reference**: `@/tools/SK8Lytz_Image_Cross_Reference.txt` (Image and string asset mappings).

### Important: Keeping the Reference Clean
To prevent the Master Reference from filling up with duplicates, or breaking due to file size limits:
- **Chunking Awareness**: The Master Reference is a large file. Always process it in chunks of ~30,000 characters to avoid context loss or character-limit errors.
- **Search Before Write**: NEVER blindly append to the end of the document. You must use `grep_search` or `view_file` to see if the topic (e.g., `0x51 Payload` or `Users Table`) already exists.
- **Update, Don't Duplicate**: If the topic exists, strictly use native tools like `replace_file_content` to edit that exact section rather than creating a secondary entry.
- **Strict Headers**: Place your findings under the appropriate structured Markdown heading (e.g., `## BLE Protocols`, `## Database Schemas`, `## Core API Services`). Do NOT use React-specific headers like Context Providers or Hooks.
- **Pure Flex Compliance**: When documenting UI patterns or architecture, verify that NO rigid structural hacks (like `position: absolute`, fixed dimensions, or negative margins) are included. The architecture documented must align with a 100% fluid Flexbox model.
- **Prune Old Assumptions**: If your new discovery proves an old note wrong, delete the old incorrect assumption from the reference file entirely.
