# Implementation Plan — `refactor/audit-neogleamz-engine`

This implementation plan details the security audit and refactor of `assets/js/neogleamz-engine.js` as part of the **Legacy Audit File-by-File Sequence** epic.

## Design Decisions & Rationale
We are refactoring the core forensic engine and helper library (`neogleamz-engine.js`) to guarantee bulletproof execution across all environments. Since the file is already clean of absolute positioning and inline event attributes, we are surgically targeting a global variable ReferenceError risk with `isSubassemblyDB` and documenting helper routines using strict JSDoc typing for cleaner IDE/agent parsing.

## User Review Required
> [!NOTE]
> This is a low-risk modernization refactor. There are no breaking changes to the external math APIs.

## Proposed Changes

### Forensic Accounting Core

#### [MODIFY] [neogleamz-engine.js](file:///d:/GitHub/neogleamz.github.io/assets/js/neogleamz-engine.js)

1. **Guard `isSubassemblyDB` Global Access**:
   Surgically wrap references to `isSubassemblyDB` with a typeof block guard to prevent sudden ReferenceErrors if the module executes before global definitions are loaded.
2. **Eradicate Code Debt via Boy Scout Mandate**:
   Inject rich JSDoc definitions over the core stats helper functions (`setStat`, `fmtNum`, `fmtMoney`, etc.) to align with Neogleamz elite development conventions.

---

## Verification Plan

### Automated Tests
- Run `npm test` to ensure all 27 unit tests pass with zero regressions:
```powershell
npm test
```
- Run linter check:
```powershell
npx eslint assets/js/neogleamz-engine.js
```

### Manual Verification
- Launch the local development server and navigate to the Stockpilez tab to verify that the FGI inventory counts and dynamic alerts load seamlessly with zero console faults.
