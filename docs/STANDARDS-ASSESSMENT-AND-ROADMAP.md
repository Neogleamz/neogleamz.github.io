# Standards Assessment & Documentation Roadmap

> **Status:** Assessment + plan · **Date:** 2026-06-25 · **Scope:** Are Neogleamz OS's coding standards and documentation correct, current, and aligned with industry practice — and what does a full, anyone-can-maintain documentation set look like?
>
> This is the keystone document for the documentation buildout. It judges what exists, names what's stale or wrong, and sequences the work. Claims about "industry practice" are sourced at the bottom.

---

## 1. The honest verdict

You have more documentation discipline than most small teams ever build: a layered ruleset, per-feature architecture docs, a plans ledger, custom commands, and a reverse-engineered architecture doc with line-level citations. That last one (`docs/ARCHITECTURE.md`) is genuinely professional-grade.

But three things are true at the same time:

1. **A meaningful share of your "standards" are not engineering standards — they're LLM-prompt persona instructions.** Emoji mandates, the `[!SUCCESS]` ban, "anti-flash recovery," "speak as an elite Lead Engineer," mandatory markdown-alert formatting. These govern how an AI *talks*, not how the app is *built*. They bloat the ruleset, date quickly, and actively work against your stated goal of "easy for anyone, AI or not, to code." A new human engineer reading `coding-preferences.md` has to wade through persona theater to reach the real rules.

2. **Parts of the docs are stale and internally contradictory.** They reference a different toolchain (Gemini/Antigravity tool names like `write_to_file`/`view_file`, paths under `C:\Users\…\.gemini\antigravity-ide`), forbid shell tools (`sed`, `awk`, `echo >`) that don't apply to your current setup, and instruct using `import.meta.env` for secrets — which **cannot work** in a no-build vanilla app served on GitHub Pages (there is no bundler to substitute `import.meta.env`). So the answer to "are they up to date?" is: the *good* rules are, but a measurable fraction describe a stack you no longer run.

3. **A few of your hard constraints are deliberately the opposite of what the industry does** — and that's the part worth the most honest conversation. Covered in §2.

The good news: the underlying *engineering* instincts are sound and often ahead of typical small-shop practice (XSS sanitization via DOMPurify wrapper, UI mutex against double-submit, 4-state UX, zero-refresh re-render, mandatory branching, backend-as-source-of-truth). The problem isn't the engineering judgment. It's that it's buried, mixed with cruft, partly stale, and not organized the way industry documentation is organized.

---

## 2. Your hard constraints, challenged honestly

You asked me to challenge these. Here's where each sits versus what big engineering orgs (Google, Stripe, Vercel, Shopify) actually do.

### 2.1 "Vanilla only — no framework, no TypeScript"

**Industry reality:** Big orgs use frameworks and TypeScript precisely *because* they scale teams and prevent classes of bugs. TypeScript is effectively the default for new web apps at scale.

**But for your situation, this is a defensible choice, not a mistake.** A solo/AI-maintained internal tool with no build step has a real virtue: zero toolchain rot, nothing to `npm audit`, no bundler breakage, viewable source. The cost you're paying is **no type safety and no compile-time checks** — which matters a lot given the bug classes in your sales-ledger math and Shopify payload parsing (all `any`-typed).

**The industry-aligned compromise that fits your constraint:** keep vanilla, but adopt **JSDoc type annotations checked by `tsc --checkJS --noEmit`**. You get ~80% of TypeScript's safety, catch real bugs (the `parseFloat(undefined)`, the missing-null cases), and *still ship zero build output* — `tsc` only checks, it doesn't transpile. You already have a `strict-jsdoc-typing` plan in `docs/plans/feat/`; this is the right path and it's underused.

### 2.2 "No build step — the 650 KB monolithic `index.html` is the deployed site"

**This is the constraint I'd push hardest on.** A 7,968-line, 648 KB HTML file with inline `<script>`/`<style>` plus 22 separate modules is the single biggest liability in the repo, and it's not aligned with any modern practice:

- **Performance:** the browser must parse ~650 KB before first paint; no code-splitting, no lazy-loading of modules a given user never opens. Big-tech baseline is route-level code-splitting and a <200 KB initial bundle.
- **Maintainability:** your own audit (`docs/code-quality-audit-report.md`) found 120+ inline `onclick=` violations and flagged the monolith as a P1. The file is too big to review safely; that's why the inline handlers persist.
- **AI-maintainability (your actual goal):** a 7,968-line file blows past the point where an AI agent can hold the whole thing in context and edit surgically. The monolith is *why* your rules need so many "surgical edit / look before leap / verify structure" guardrails — the guardrails are compensating for the architecture.

**The honest part:** you can keep "no build step" *or* you can keep the monolith maintainable, but not both forever. Two industry-aligned options that respect "no framework":
   - **Option A (no build, still vanilla):** split `index.html` into native ES modules (`<script type="module">` with `import`/`export`). Browsers load these natively — still zero build. This alone would let the file shrink to a thin shell and make every module independently reviewable.
   - **Option B (minimal build):** introduce a single bundling/minify step (esbuild/Vite) only for production. You keep vanilla JS, gain code-splitting and `import.meta.env` for secrets (which your docs already assume exists), and the source stays framework-free.

I'm not saying do this today. I'm saying: the monolith should be documented as **known technical debt with a migration path**, not enshrined as a standard. Right now your docs treat it as an immutable virtue.

### 2.3 Public GitHub Pages + single Supabase project + single shared auth + no CSP

This is the cluster with real security weight, and it ties directly to the code review findings.

- **No security headers possible on GitHub Pages.** GitHub Pages cannot set response headers at all — no `Content-Security-Policy`, no `HSTS`, no `X-Frame-Options`. A `<meta>` CSP tag is a *partial* workaround (it can't do `frame-ancestors`). Every big-tech app ships a strict CSP as defense-in-depth behind XSS. You structurally can't, as long as you're on raw Pages. **Putting Cloudflare (free tier) in front of Pages** restores header control and is the standard fix for this exact situation.
- **Single shared auth + `USING(true)` RLS.** Your hardening migration scoped policies to `authenticated`, which is good — but every authenticated user can still read/write *every* row. Industry RLS practice is per-tenant/per-user isolation (`auth.uid()`-based policies, indexed tenant columns). For a genuinely single-operator internal tool this is acceptable *if documented as an explicit accepted risk*; it becomes dangerous the moment you add a second user with a narrower need-to-know.
- **Service-role key reach.** Confirmed not leaked into the front-end (good). The standing rule "never expose service_role client-side" is correct and matches Supabase's own guidance; keep it loud.
- **The webhook replay auth-bypass** (from the code review) is the concrete cost of "public Pages + `verify_jwt=false`": there's no platform layer to lean on, so any gap in the function *is* the perimeter.

**Bottom line on constraints:** vanilla-only is fine; JSDoc-checking closes its biggest hole. The monolith and the no-CSP/public-Pages posture are the two places your standards currently bless something the industry would flag. Document them as accepted-risk-with-a-path, not as principles.

---

## 3. Are the standards correct? Grading each one

Legend: ✅ industry-aligned · 🟡 partially right / needs update · 🔴 off-base, stale, or counterproductive

| Standard (source) | Grade | What the industry does / the fix |
|---|---|---|
| DOMPurify wrapper for all dynamic HTML (`core-safety-protocols` §7) | ✅ | Correct and current. OWASP's own XSS guidance is "sanitize with a trusted library." Wrapping in `window.safeHTML()` is exactly right. Gap: it's a rule, not yet enforced — 399 `innerHTML` sites exist. Add a lint rule. |
| No inline event handlers; `data-click` delegation | ✅ | Aligned (CSP-friendly, unbindable-listener-free). But your own audit found 120+ violations — the rule is correct, the *enforcement* isn't. |
| UI mutex against double-submit (`executeWithButtonAction`) | ✅ | This is a genuinely good pattern many teams lack. Keep. |
| 4-state UX (loading/error/empty/success) | ✅ | Matches modern UX/component standards. Keep. |
| Zero-refresh re-render after mutation | ✅ | Correct instinct (optimistic/just-in-time UI). Industry would add: reconcile from server response, not assumed success. |
| Mandatory feature/fix branching + no direct `main` | ✅ | Standard trunk-based / PR-gated flow. Keep. |
| Backend-as-source-of-truth / fix schema not frontend bandages | ✅ | Strong, correct database-first principle. Keep. |
| Secrets: never hardcode, gitignore `.env` | ✅ | Correct. But the specific mechanism (`import.meta.env`) is 🔴 — see below. |
| 8-point grid, `clamp()` scaling, 48px tap targets | ✅ | Aligned with current design-system + accessibility (WCAG target-size) practice. |
| "Close" buttons must be the word, never ✕ | 🟡 | Defensible accessibility/clarity choice, but stated as an absolute when the industry norm is an ✕ *with an `aria-label`*. Fine as a house style; document it as house style, not a universal truth. |
| `localStorage` caching with `sk8lytz_` prefix | 🟡 | Reasonable, but no documented invalidation/versioning strategy. Industry adds a cache-version key to avoid stale-schema bugs. |
| Secrets via `import.meta.env` (`core-safety-protocols` §2) | 🔴 | **Cannot work** in a no-build app — `import.meta.env` is a bundler feature (Vite). On raw Pages there's nothing to inject it. This is a stale rule from a build-based assumption. Fix the doc. |
| "Native tools only — `sed`/`awk`/`echo >` globally blocked" | 🔴 | Stale tool-environment rule from the Gemini/Antigravity setup. Irrelevant and confusing in the current toolchain. Remove or rewrite. |
| Gemini tool names (`write_to_file`, `view_file`, `replace_file_content`) | 🔴 | Dead references to a different agent. Replace with tool-agnostic language ("read before edit; make surgical edits; review the diff"). |
| Emoji/persona/markdown-alert mandates (`coding-preferences` §0) | 🔴 | Not an engineering standard. It's output-styling for one AI. It dates instantly, doesn't transfer to a human or another tool, and buries the real rules. Move to an optional "AI output style" appendix, out of the core standards. |
| "Anti-flash recovery," "banned idle commands" (§8) | 🔴 | Tool-runtime quirk handling, not a coding standard. Belongs in an agent-ops note, not the ruleset. |
| Mandatory `MANDATORY OUTPUT FORMAT` template in every workflow | 🟡 | The *intent* (consistent, parseable output) is good; the execution couples your standards to specific emoji/alert syntax. Keep the consistency goal, drop the rigid emoji coupling. |

**Reading of the table:** your *technical* standards are mostly ✅ and often above small-shop average. Almost everything 🔴 is either (a) stale toolchain assumptions or (b) AI-persona styling masquerading as engineering policy. Separating those two from the real standards is the single highest-leverage cleanup.

---

## 4. Is the documentation organized the way industry organizes it?

Not yet — and this is fixable with a known framework rather than invention.

The industry standard for "documentation anyone can use" is **Diátaxis**: every doc is one of four types, and you never mix them.

| Diátaxis type | Purpose | What you have today |
|---|---|---|
| **Tutorial** (learning) | Get a newcomer to a first success | ❌ None. No "set up the repo and make your first change" path. |
| **How-to guide** (task) | Steps to do a specific job | 🟡 Scattered — your `.claude/commands` are how-tos, but for AI workflows, not for a human contributor. |
| **Reference** (information) | Exact facts: schema, APIs, UI labels | ✅ Strong — `ARCHITECTURE.md`, the Master Reference, nomenclature dictionary. |
| **Explanation** (understanding) | Why it's built this way | 🟡 Partial — architecture doc explains some; the *why* behind constraints isn't captured. |

You're heavy on Reference, light on Tutorial/How-to, and your Explanation is tangled up inside rule files. That's the classic imbalance Diátaxis exists to fix. Pair it with **arc42** (a standard architecture-doc skeleton) for the system-level doc and **ADRs** (Architecture Decision Records — one short file per significant decision, e.g. "why vanilla," "why no build," "why single Supabase project") to capture the *why* that's currently implicit. ADRs are exactly how big orgs record the kind of constraint decisions you've made.

---

## 5. What's missing (gap analysis)

Documentation a fully-documented app of this size should have, that you don't:

- **A contributor onboarding tutorial** — clone → run locally → make a trivial change → verify → ship. The single most important missing doc for "anyone can maintain it."
- **A consolidated, current `CONTRIBUTING.md` / standards file** — the de-crufted, de-duplicated version of your rules, readable by a human in 10 minutes. Right now the same XSS rule is stated in 3 files.
- **ADRs for the big constraints** — vanilla-only, no-build, single Supabase, public Pages, single auth. Each as a 1-page decision with context/decision/consequences. This is where the honest tradeoffs from §2 get recorded.
- **API / edge-function reference** — the `shopify-webhook` and `shopify-force-sync` contracts: inputs, headers, auth model, side effects, failure modes. Currently only in code + one architecture note.
- **Data model / schema reference that's authoritative and generated** — 61 tables, RLS policies per table, which app owns which. Partly in Master Reference; should be generated from the live schema so it can't drift.
- **Security model doc** — threat model, the accepted risks (single auth, no CSP), the perimeter (edge functions), and the incident runbook. Ties the code-review findings into a living register.
- **Runbooks** — "webhook is failing," "restore from backup," "rotate the Shopify secret." Operational how-tos for when something breaks.
- **Module-level reference** — each `*-module.js`: responsibility, public functions, the DB tables it touches, the render functions it owns. This is what makes per-module editing safe for an AI.
- **A docs index / map** — one entry point that routes a reader (or agent) to the right doc. Your docs exist but there's no front door.

---

## 6. The buildout roadmap (staged)

Full documentation of an app this size is multi-session work. Sequenced by leverage:

**Stage 0 — De-cruft and de-duplicate (fast, high leverage).**
Split the ruleset into *engineering standards* (tool-agnostic, human-readable) vs *AI agent operating notes* (persona, output formatting, tool quirks). Delete stale toolchain rules (`import.meta.env`, `sed`/`awk` bans, Gemini tool names). Collapse the triplicated XSS/branching rules into one canonical statement each. Output: a clean `CONTRIBUTING.md` + a separate `docs/agent-operating-notes.md`.

**Stage 1 — Establish the framework + front door.**
Adopt Diátaxis + arc42 + ADR structure. Create `docs/README.md` as the documentation map. Write the first ADRs for the §2 constraints (this captures the honest tradeoffs as decisions of record).

**Stage 2 — Onboarding tutorial + contributor how-tos.**
The "make your first change" path. This is what delivers "easy for anyone, AI or not."

**Stage 3 — Reference layer, generated where possible.**
Schema reference generated from live Supabase; edge-function API reference; module-by-module reference. Wire JSDoc + `tsc --checkJS` so the type info is real and checked.

**Stage 4 — Security & operations.**
Security model doc + accepted-risk register (folds in the code-review findings), plus runbooks for the top failure modes.

**Stage 5 — Enforcement, so docs don't rot.**
Lint rules that enforce the standards the docs describe (ban raw `innerHTML`, ban inline `onclick`), a docs-freshness check, and a "generated" stamp on reference docs so drift is visible. Docs that aren't enforced become fiction — this stage is what keeps the whole set true.

---

## 7. If we do nothing else, do these five first

1. **Separate AI-persona instructions from engineering standards.** Biggest single win for "anyone can maintain it."
2. **Delete the stale toolchain rules** (`import.meta.env`, shell-tool bans, Gemini tool names) — they're actively misleading.
3. **Write a contributor onboarding tutorial** — the missing front door.
4. **Record the 5 constraint decisions as ADRs**, honestly stating the monolith and no-CSP tradeoffs as accepted risk with a path.
5. **Add lint enforcement for the two rules you already believe in** (no raw `innerHTML`, no inline `onclick`) so the standard and the code stop disagreeing.

---

## Sources

- OWASP Top 10:2025 (Security Misconfiguration rose to #2; new Supply-Chain & Exceptional-Conditions categories; SSRF folded into Broken Access Control): https://owasp.org/Top10/2025/ · https://about.gitlab.com/blog/2025-owasp-top-10-whats-changed-and-why-it-matters/
- Diátaxis documentation framework (tutorials / how-to / reference / explanation): https://diataxis.fr/
- GitHub Pages cannot set custom response headers (no CSP/HSTS); `<meta>` CSP is partial; Cloudflare-in-front is the workaround: https://github.com/orgs/community/discussions/54257 · https://www.isaacsmith.us/blog/2022/add-csp-to-github-pages
- Supabase RLS / service-role best practice (enable RLS on every public table, never expose service_role client-side, index RLS columns, per-tenant isolation): https://supabase.com/docs/guides/database/postgres/row-level-security · https://makerkit.dev/blog/tutorials/supabase-rls-best-practices
