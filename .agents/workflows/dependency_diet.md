---
name: dependency_diet
description: "Triggers whenever the AI attempts to add an external library, forcing a justification check and prioritizing native Browser APIs."
trigger: "/dependency_diet, /dependencies, verify dependencies, check dependencies"
---

# Dependency Diet & Anti-Bloat Protocol

Whenever your Implementation Plan requires adding a new external library, package, or script dependency (whether via `npm install` or a CDN `<script>` tag), you must pause the execution workflow and execute the following justification check:

1. **Native Alternative Check (Browser Exclusivity)**: Can this problem be solved using native Browser Web APIs (e.g., standard ES6+ JavaScript, CSS3, `fetch`, `window.crypto`, DOM manipulation) without importing a library? 
   - If yes, you are strictly forbidden from suggesting the external library. Write the native Vanilla JS code instead.
2. **The 3-Point Justification**: If an external library is absolutely unavoidable to save significant development time, you must present a "Dependency Proposal" to the user containing the required information.
3. **The Micro-Alternative**: Always propose a smaller, zero-dependency, or micro-library alternative alongside the heavy standard choice (e.g., suggesting native `Intl` or `date-fns` instead of `moment.js`).
4. **Approval Gate (HALT)**: You must **HALT** and explicitly ask: *"Do I have permission to add this dependency to our project?"* Do not run any install commands or inject CDN links until the user explicitly approves.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

When presenting the Dependency Proposal (Step 2), you MUST render the following structured output. Do NOT output a plain text justification. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 📦 Dependency Proposal — `<library-name>`

#### Justification Card
Render a Markdown table:
```
| Criteria | Value |
|---|---|
| 📦 Package | `<package-name>` |
| ⚖️ Unpacked Size | ~N kB (minified) |
| 📅 Last Commit | YYYY-MM-DD |
| ⭐ GitHub Stars | N |
| 🔗 Native Alternative | `<native API>` or "None available" |
| ❓ Why Native Won't Work | 1-sentence explanation |
```

#### 🔬 Micro-Alternative Comparison
Render a comparison table:
```
| Feature | `<heavy-lib>` | `<micro-lib>` | Native API |
|---|---|---|---|
| Size | 150kB | 5kB | 0kB |
| Tree-shakeable | ✅ | ✅ | N/A |
| Browser Support | All | All | Check needed |
| Maintenance | Active | Active | Built-in |
```

#### 🎯 Approval Gate
Render a `> [!IMPORTANT]` block: "Do I have permission to add `<package-name>` to the project? Type **'approved'** or suggest an alternative."