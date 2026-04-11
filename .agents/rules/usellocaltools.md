---
trigger: always_on
description: "Auto-migrated Core A.I. Rule"
---

# Local Tool Enforcement Rule

When interacting with the file system or searching the codebase, you MUST prioritize your native, specialized API tools over generic terminal commands.

1. **File Modification**: NEVER use terminal utilities like `sed`, `awk`, `echo >`, or `cat >>` to modify files. You must strictly use `write_to_file`, `replace_file_content`, or `multi_replace_file_content`.
2. **File Searching**: NEVER use `grep`, `find`, or `ls` via the `run_command` terminal. You must strictly use your native `grep_search` and `list_dir` tools.
3. **File Viewing**: Do not use `cat` to read long files in the terminal; use the `view_file` tool to ingest the file safely.
*Exception:* Terminal commands are ONLY permitted for their mandatory purposes (e.g., `git`, `npm`, `npx tsc`, checking connected hardware, or booting servers).