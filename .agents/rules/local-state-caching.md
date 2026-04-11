---
description: "Auto-migrated Core A.I. Rule"
mode: "always"
---

---
glob: "**/*.js"
---

# Skill: Local State Caching

When instructed to handle user sessions, toggle UI states, or perform temporary data storage without requiring an immediate Supabase round-trip, you must deploy these vanilla data-caching skills:

1. **Synchronous Speed Priority**:
   - Use `localStorage` exclusively to persist desktop-first user configurations, cart data, and session toggles across page reloads.
   - Use `sessionStorage` for sensitive or temporary analytical tracking that should clear when the tab closes.

2. **JSON Serialization Standards**:
   - Never attempt to store raw objects. You must explicitly serialize payloads: 
     `localStorage.setItem('SK8Lytz_CacheKey', JSON.stringify(payload))`
   - Always implement `try/catch` blocks around `JSON.parse(localStorage.getItem('key'))` to prevent hard crashes if the cache string becomes corrupted.

3. **Namespace Prefixing**:
   - Start all custom local storage keys with a distinct prefix to prevent collisions with third-party tracking scripts (e.g., `app_cache_user_prefs`).

4. **Cache Invalidation**:
   - If a schema or rule changes drastically in the JavaScript logic, provide a fallback script that explicitly clears the corrupted key using `localStorage.removeItem('key')`.