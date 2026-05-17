# 🦅 Neogleamz OS

Welcome to the Neogleamz Operational System repository. This project powers the internal business architecture and external hardware controllers for Neogleamz (SK8Lytz).

## 🛑 Architectural Philosophy (Strict Constraints)

This repository is built under a highly specific set of engineering constraints. If you are an AI agent or a new developer, you **MUST** adhere to the following:

1. **Vanilla Exclusivity**: This is a pure Web-Native application. **No React, Vue, jQuery, or TypeScript logic injections are permitted.** DOM elements are modified strictly via pure native JS.
2. **Web Bluetooth Exclusivity**: Hardware interaction relies strictly on standard Web Bluetooth APIs (`navigator.bluetooth`). No Node.js native shims.
3. **Responsive Flexbox Logic**: Absolutely no rigid `position: absolute` hacks. The architecture must flow naturally via 100% responsive Flexbox logic (`vh`, `vw`, `%`, `calc`).
4. **Agentic Workflows**: All feature development, bug fixing, and releases are managed via the custom Agentic Workflow Engine (e.g., `[/bucketlist]`, `[/ship_it]`, `[/release]`).

## 📚 The Source of Truth

This repository does not rely on scattered Wiki pages. The absolute source of truth exists in two immutable ledger files:

- **[The Master Reference](tools/SK8Lytz_App_Master_Reference.md)**: The technical encyclopedia. Contains all Hardware BLE payloads, Supabase database schemas, Vanilla JS architectures, and Core API services. **Do not hallucinate assumptions; read the Master Reference.**
- **[The Bucket List](tools/SK8Lytz_Bucket_List.md)**: The permanent, living task tracker. All feature branches are derived directly from this ledger.

## 🚀 Quick Start & Boot Sequence

Because this is a Vanilla JS browser application, there is no heavy build step (no Webpack, Vite, etc., for the core runtime). 

1. **Serve Locally**: 
   Launch any standard HTTP server (like VS Code Live Server or Python's `http.server`) at the root directory targeting `index.html`.
   ```bash
   npx serve .
   ```
2. **Testing Engine**:
   We use Jest for our headless mathematical and forensic data validation.
   ```bash
   npm test
   ```
3. **Code Quality**:
   Strict linting is enforced prior to any commits.
   ```bash
   npx eslint .
   ```

## 🔒 Security & Secrets
NEVER hardcode API keys or Supabase authentication tokens in the `.js` files. Use the `.env.local` file (referenced via `.env.example`) and rely on `import.meta.env` for environment injection during edge deployment.
