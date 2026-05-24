# Implementation Plan — Documentation Relocation & Master Reference Integration (debt/documentation-consolidation)

### Design Decisions & Rationale
To guarantee absolute repository hygiene and strictly enforce our newly established **Root Directory Isolation & Whitelisting Standard** (Core Safety Protocol 6), all loose markdown files in the project root (`nomenclature_dictionary.md`, `task_engine_evolution.md`, and `test_shared.md`) will be consolidated into the unified `/docs/` subdirectory. We will utilize standard Git move operations (`git mv`) to preserve forensic edit history. Furthermore, we will deeply integrate these supplementary architectural files into [tools/SK8Lytz_App_Master_Reference.md](file:///d:/GitHub/neogleamz.github.io/tools/SK8Lytz_App_Master_Reference.md) with absolute paths and detailed section indexes so the development models can natively discover and reference them during planning cycles. Finally, we will update the Git pre-commit validation hook and safety rule files to remove them from the allowed root whitelist.

---

## Proposed Changes

### Documentation Consolidation

#### [NEW] [docs/nomenclature_dictionary.md](file:///d:/GitHub/neogleamz.github.io/docs/nomenclature_dictionary.md)
- Relocated from repository root via `git mv` to maintain perfect historical tracking.

#### [NEW] [docs/task_engine_evolution.md](file:///d:/GitHub/neogleamz.github.io/docs/task_engine_evolution.md)
- Relocated from repository root via `git mv`.

#### [NEW] [docs/test_shared.md](file:///d:/GitHub/neogleamz.github.io/docs/test_shared.md)
- Relocated from repository root via `git mv`.

### Master Reference Integration

#### [MODIFY] [tools/SK8Lytz_App_Master_Reference.md](file:///d:/GitHub/neogleamz.github.io/tools/SK8Lytz_App_Master_Reference.md)
- Append a new section `## 📚 8. Supplementary Architectural Documentation` at the bottom of the file.
- Surgically document the purpose and structure of the three relocated files with direct absolute hyperlinks (without backticks!).
- Update Section 12's `Root Directory Isolation` section to remove these files from the root whitelist.

### Git Hook and Safety Rules

#### [MODIFY] [.githooks/pre-commit](file:///d:/GitHub/neogleamz.github.io/.githooks/pre-commit)
- Remove `nomenclature_dictionary.md` and `test_shared.md` from the whitelisted Node.js set.

#### [MODIFY] [.agents/rules/core-safety-protocols.md](file:///d:/GitHub/neogleamz.github.io/.agents/rules/core-safety-protocols.md)
- Remove `nomenclature_dictionary.md` and `test_shared.md` from Section 6's whitelisted markdown root files.

---

## Verification Plan

### Automated Tests
- Run `git status` to verify Git recognizes the file moves as 100% rename operations rather than independent creations/deletions.
- Run Jest test suites and ESLint flat linter checkers to ensure no regression:
  ```bash
  npm test
  npx eslint .
  ```

### Manual Verification
- N/A (Verified purely via filesystem output logs and Git status rename confirmation).
