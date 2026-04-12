---
name: local_caching
description: "Strict coding standards for browser-native caching and data serialization."
trigger: always_on
---

# Local State Caching Rule

Whenever instructed to handle user sessions, toggle UI states, or perform temporary data storage without requiring an immediate Supabase round-trip, you must deploy these vanilla data-caching constraints:

1. **Synchronous Speed Priority**:
   - Use `localStorage` exclusively to persist user configurations, sidebar states, and session toggles across page reloads.
   - Use `sessionStorage` for sensitive or temporary tracking that must clear when the browser tab closes.

2. **JSON Serialization Standards**:
   - NEVER attempt to store raw objects or arrays directly. You must explicitly serialize payloads: 
     `localStorage.setItem('neogleamz_user_prefs', JSON.stringify(payload))`
   - ALWAYS implement `try/catch` blocks around `JSON.parse(localStorage.getItem('key'))` to prevent hard crashes if the cache string becomes corrupted or maliciously altered.

3. **Namespace Prefixing**:
   - Start all custom local storage keys with the distinct prefixes `neogleamz_` or `neo_` (e.g., `neogleamz_parser_profiles`, `neoResizer_`) to prevent collisions with third-party tracking scripts.

4. **Cache Invalidation**:
   - If a schema or logic rule changes drastically in the JavaScript, you must provide a fallback script or migration check that explicitly clears the corrupted key using `localStorage.removeItem('key')` before setting the new one.
