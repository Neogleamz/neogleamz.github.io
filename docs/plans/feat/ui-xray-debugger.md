# Implement UI X-Ray Debugger Workflow (`/ui_xray`)

The goal of this task is to provide the AI with a strict diagnostic workflow string allowing it to rapidly debug Vanilla HTML flexbox boundaries without guessing line numbers or requiring constant human intervention.

## User Review Required

Please review the proposed execution sequence for the `[/ui_xray]` trigger. 

## Proposed Changes

### Configuration (`.agents/workflows/ui_xray.md`)

#### [NEW] [ui_xray.md](file:///d:/GitHub/neogleamz.github.io/.agents/workflows/ui_xray.md)
I will build a new agent workflow file that enforces the following sequence when `/ui_xray` is called:
1. **The Core Hook**: The AI will physically inject an inline `<style id="ui-xray-debugger">` block into `index.html` that paints every element type (`div`, `span`, `header`) with distinct semitransparent neon outlines, instantly revealing overlap violations.
2. **The Scanner Integration**: The AI will then utilize its native `browser_subagent` (or ask the user to share a screenshot) to look at the painted screen, allowing it to literally *see* the DOM bounds collision with its own vision parameters.
3. **The Tear-Down**: Once the offending `div` is mathematically identified, the AI autonomously strips the macro-style tag from the codebase and builds the precise CSS patch.

### Design Decisions & Rationale
We are avoiding heavy programmatic mutation observers. Injecting a simple, rigid CSS structural overlay natively exposes every flex container without requiring the application state to refresh or rebuild. By hooking this into the native web-browser rendering engine, the AI can visually trace layout defects on 100% vanilla setups.

## Open Questions

None currently.

## Verification Plan

### Manual Verification
- We will call `/ui_xray` in our current session. I'll test it against a sample `.pane-header-bar` inside `index.html` and verify the CSS injection and cleanup sequence executes perfectly.
