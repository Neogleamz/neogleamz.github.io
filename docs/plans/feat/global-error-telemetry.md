# Global Error Telemetry Wrapper

The goal of this task is to implement a global execution wrapper to catch, log, and surface 100% of UI events, interactions, and silent errors directly to the Diagnostics Console (`sysLog`).

## Proposed Changes

### `assets/js/system-event-delegator.js`

#### [MODIFY] [system-event-delegator.js](file:///d:/GitHub/neogleamz.github.io/assets/js/system-event-delegator.js)
1. **Event Telemetry**: Inject an interaction log just before the `switch(action)` block in every event listener (e.g. `click`, `keyup`, `change`, etc.) to surface the event to the Diagnostics Console.
   ```javascript
   if (typeof window.sysLog === 'function') {
       window.sysLog(`[Telemetry] ${event.type.toUpperCase()}: ${action}`);
   }
   ```
2. **Error Surfacing**: Replace all instances of `console.error` in the `catch` blocks with a structured call to `sysLog` that properly captures the error stack trace.
   ```javascript
   catch (error) {
       console.error(`[Event Delegator] Error executing ${action} on ${event.type}:`, error);
       if (typeof window.sysLog === 'function') {
           window.sysLog(`[Event Delegator] Error: ${action} - ${error.message}`, true, error.stack);
       }
   }
   ```

## User Review Required

> [!IMPORTANT]
> **Open Question:**
> Should the interaction telemetry (`window.sysLog('[Telemetry] CLICK: action_name')`) be logged as a standard message, or do you prefer a dedicated subtle styling for telemetry so it doesn't clutter the Diagnostics Console as much as normal logs or errors? 

## Verification Plan

### Manual Verification
1. I will execute `npm test` and `npx eslint .` to ensure no syntax errors.
2. We will test clicking a button bound via `data-click` and verify that the `[Telemetry]` log appears in the Diagnostics Console.
3. We will simulate a Javascript error inside a click handler and verify that the `sysLog` successfully catches and surfaces the error stack to the Console.
