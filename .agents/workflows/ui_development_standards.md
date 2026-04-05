---
description: Mandatory UI Design and Layout Protocol for Neogleamz Web Platform
---

# Neogleamz UI Development Standards

> **Living Document.** These standards exist to enforce uniformity and prevent technical debt — not to block modernization. If a better pattern, technology, or aesthetic emerges, update this document and migrate the existing codebase to match. The rule is: *do it everywhere or don't do it anywhere.* Standards evolve; fragmentation doesn't.

**⛔ ENFORCEMENT:** Every new hub, module, page, or component MUST follow the current version of this document. If you intentionally supersede a pattern, update the relevant section and file a migration note. Partial adoption of a new pattern is a critical failure — it creates the very inconsistency this doc exists to prevent.

---

## 1. Global CSS Variable Strictness

*   **No Hardcoded Hex Colors for Backgrounds/Text.** Use the token system:
    *   `var(--bg-body)` · `var(--bg-glass)` · `var(--bg-panel)` · `var(--bg-input)` · `var(--bg-container)` · `var(--bg-bar)`
    *   `var(--border-color)` · `var(--border-input)`
    *   `var(--text-heading)` · `var(--text-main)` · `var(--text-muted)`
    *   `var(--primary-color)` · `var(--secondary-color)` · `var(--shadow-color)` · `var(--glass-shadow)`
*   **Branding hex is allowed only for:** buttons, badges, icons, chart elements — where explicit colors provide UI meaning.

---

## 2. Structural & Layout Mandates

*   **Flexbox or Grid for all layout.**
*   **No hardcoded `px` for layout sizing.** Use fluid units: `clamp(min, preferred, max)`, `%`, `vw`, `vh`, `fr`.
*   Fixed `px` only for: icon sizes, border widths (1px, 2px), badge heights.
*   **No Tailwind CSS utility classes in HTML** — the project does not load Tailwind. Use the design system CSS classes or inline styles with `var(--*)` tokens. Tailwind-styled code will break silently.

---

## 3. Scrollbar & Overflow Governance

*   **Never declare `::-webkit-scrollbar` locally.** The global definition in `index.html` is the only authority.
*   Width: `8px` · Thumb: `rgba(45,212,191,0.45)` idle → `rgba(247,147,32,0.85)` hover
*   Use `overflow-y: auto` on scrollable containers to inherit the global scrollbar automatically.
*   **Purge `custom-scroll` / `custom-scrollbar` classes** — deprecated and removed.

---

## 4. Resizer Dividers & Lateral Scaling

*   All split-pane drag dividers **must** use `class="h-resizer"` (or `v-resizer`).
*   No inline styles, no local color overrides, no JS `onmouseover` hover hacks on resizers.
*   Color: Teal `#2dd4bf` · Drag handle: `⋮` via CSS `::after`.
*   **Mandatory Event Hook:** When creating a `.bom-layout` structure containing a `.bom-sidebar` and `.bom-main` component, always place the `<div class="h-resizer">` exactly between them.
*   **Physics Engine:** Hook the resizer strictly to `onmousedown="initNeoSidebarResizer(event)"`. This triggers the global Flex-Box scaling override math (`sidebar.style.flex = 0 0 Xpx;`) allowing dynamic boundary collision checks across every Fulfillz/Makerz module universally without custom pane-specific drag classes.

```html
<div class="bom-layout" style="flex-grow:1; min-height:0;">
    <div class="bom-sidebar">...Content...</div>
    <div class="h-resizer" onmousedown="initNeoSidebarResizer(event)"></div>
    <div class="bom-main">...Content...</div>
</div>
```

---

## 5. Pane Header Bar (Mandatory for ALL Executive Panes)

Every `executive-pane` must have a `.pane-header-bar` as its **first child**. Title must be centered. Action buttons (if any) go in `.pane-header-actions`.

```html
<!-- Title only -->
<div class="executive-pane">
    <div class="pane-header-bar">
        <span class="pane-header-title">PAGENAME</span>
    </div>
    <div class="nav-zone left" onclick="..."><i>‹</i></div>
    <div class="nav-zone right" onclick="..."><i>›</i></div>
    <div class="bom-layout" style="flex-grow:1; min-height:0;">
        <div class="bom-main" style="padding:20px;">
            ...content...
        </div>
    </div>
</div>

<!-- With action buttons -->
<div class="executive-pane">
    <div class="pane-header-bar">
        <span class="pane-header-title">PAGENAME</span>
        <div class="pane-header-actions">
            <button class="btn-blue">⚙️ ACTION</button>
            <button class="btn-red">⚠️ DANGER</button>
        </div>
    </div>
    ...
</div>
```

**Rules:**
- Title is `position:absolute; left:50%; transform:translateX(-50%)` — centered regardless of buttons
- `pane-header-bar` is transparent (no background, no border) — content starts immediately below
- Never add a fixed height or `min-height` to `.pane-header-bar`
- Never create a separate button row div below the header bar

---

## 6. Standard Button Classes

| Class | Color | Use Case |
|---|---|---|
| `btn-blue` | Blue `#3b82f6` | Primary action, navigation, neutral action |
| `btn-green` | Green `#10b981` | Confirm, save, create, archive |
| `btn-red` | Red `#ef4444` | Destructive, reset, delete, danger |
| `btn-orange` / `btn-brand` | Orange `#FF8C00` | Primary brand CTA, Add actions |
| `icon-btn` | Muted | Small circular icon-only button |

```html
<button class="btn-blue">Save</button>
<button class="btn-red" style="width:auto; padding:6px 14px;">Delete</button>
<button class="icon-btn" title="Edit">✏️</button>
```

---

## 7. Dropdown / Select Standard

**RULE: Never use `<select multiple>` for multi-select UIs.** Use the custom panel pattern below.

**RULE: Strict Dataset Filtering (`is_label` Exclusions).**
Whenever populating an internal Retail Product dropdown or array mapping from the master `productsDB` table, you MUST explicitly exclude Custom Labels to prevent them from masquerading as physical products.
If mapping a "Retail" array, your filter algorithm MUST be:
```javascript
let retail = sorted.filter(p => !isSubassemblyDB[p] && !(productsDB[p] && productsDB[p].is_3d_print) && !(productsDB[p] && productsDB[p].is_label));
```

### Standard Single Select
```html
<div style="position:relative;">
    <i class="fa-solid fa-icon" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:11px; pointer-events:none;"></i>
    <select onchange="myHandler(this.value)" style="width:100%; padding:6px 28px; background:var(--bg-input); border:1px solid var(--border-input); border-radius:6px; font-size:12px; color:var(--text-main); cursor:pointer; appearance:none;">
        <option value="">All Items</option>
    </select>
    <i class="fa-solid fa-chevron-down" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:9px; pointer-events:none;"></i>
</div>
```

### Standard Multi-Select (Custom Panel)
The pattern used in Socialz "All Styles" — a trigger button + absolutely-positioned panel containing styled checkbox labels. Toggle via `display:none/block`, **never via Tailwind `.hidden`**.

```html
<!-- HTML -->
<div style="position:relative;" id="my-ms-container">
    <i class="fa-solid fa-tag" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:11px; z-index:10; pointer-events:none;"></i>
    <button onclick="toggleMsPanel('my')" id="my-ms-btn"
        style="width:100%; padding:6px 28px; background:var(--bg-input); border:1px solid var(--border-input); border-radius:6px; text-align:left; font-size:11px; color:var(--text-main); cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
        <span id="my-ms-text">All Items</span>
        <i class="fa-solid fa-chevron-down" style="font-size:9px; color:var(--text-muted);"></i>
    </button>
    <div id="my-ms-panel" style="display:none; position:absolute; top:calc(100% + 4px); left:0; width:100%; background:var(--bg-panel); border:1px solid var(--border-color); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.35); z-index:500; max-height:220px; overflow-y:auto;">
        <div id="my-ms-list" style="padding:6px; display:flex; flex-direction:column; gap:2px;">
            <!-- Inject via JS -->
        </div>
    </div>
</div>
```

```javascript
// JS — render items, toggle, click-outside
function renderMyMsItems(items) {
    const list = document.getElementById('my-ms-list');
    list.innerHTML = items.map(item => `
        <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:6px; cursor:pointer;" onmouseover="this.style.background='var(--bg-input)'" onmouseout="this.style.background='transparent'">
            <input type="checkbox" style="width:13px; height:13px; accent-color:var(--primary-color); cursor:pointer;" ${selected.includes(item) ? 'checked' : ''} onchange="handleMyToggle('${item}')">
            <span style="font-size:12px; color:var(--text-main); font-weight:600;">${item}</span>
        </label>
    `).join('');
}
function toggleMsPanel(id) {
    const p = document.getElementById(`${id}-ms-panel`);
    p.style.display = (p.style.display === 'none' || !p.style.display) ? 'block' : 'none';
}
window.addEventListener('click', e => {
    const c = document.getElementById('my-ms-container');
    const p = document.getElementById('my-ms-panel');
    if (c && !c.contains(e.target)) p.style.display = 'none';
});
```

---

## 8. Hub / Page Structure

Every hub tab must follow this nesting pattern:

```html
<div id="myhub-tab" class="tab-content" style="padding:0;">
    <!-- Landing (shown when no pane is active) -->
    <div id="myHubLanding" class="hub-landing hub-container" style="display:none; flex-grow:1; padding:40px;">
        <div class="hub-card" onclick="showMyPane('pane1')">
            <i>🔧</i>
            <h2>SECTION NAME</h2>
            <p>Short description.</p>
            <div class="hub-kpi-grid">
                <div class="kpi-row"><span>KPI Label</span><strong id="statMyKpi">--</strong></div>
            </div>
        </div>
    </div>

    <!-- Pane (shown when drilling in) -->
    <div id="paneMySection" class="executive-pane">
        <div class="pane-header-bar">
            <span class="pane-header-title">SECTION NAME</span>
            <div class="pane-header-actions">
                <!-- optional buttons -->
            </div>
        </div>
        <div class="nav-zone left" onclick="showMyPane('prevSubPane')"><i>‹</i></div>
        <div class="nav-zone right" onclick="showMyPane('nextSubPane')"><i>›</i></div>
        <div class="bom-layout" style="flex-grow:1; min-height:0;">
            <div class="bom-main" style="padding:20px;">
                <!-- content -->
            </div>
        </div>
    </div>
</div>

**Navigation Rule:** The `.nav-zone` left/right arrows MUST be used exclusively to cycle laterally between identical-level sub-panes inside the active Hub. They MUST NOT be used to return to the root Hub landing page. (Returning to the hub landing page is handled automatically by clicking the main Hub tab icon in the global top header, e.g., the 'FULFILLZ' button).
```

---

## 9. Kanban Card

Used in Packerz. All cards must match this structure:

```html
<div style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:10px; cursor:pointer; transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--primary-color)'" onmouseout="this.style.borderColor='var(--border-color)'">
    <!-- Card Header -->
    <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong style="font-size:13px; color:var(--text-heading);">ORDER #1234</strong>
        <span class="status-badge st-queued">Awaiting</span>
    </div>
    <!-- Card Body -->
    <div style="font-size:12px; color:var(--text-muted); display:flex; flex-direction:column; gap:4px;">
        <span>1x Product Name</span>
    </div>
    <!-- Card Footer -->
    <div style="font-size:11px; color:var(--text-muted); border-top:1px solid var(--border-color); padding-top:8px;">
        📅 Due: 2026-04-15
    </div>
</div>
```

**Status badge classes:** `st-queued` · `st-active` · `st-completed` · `st-failed`

---

## 10. Modal / Popup Windows

All modals must use `.modal-overlay`. Never use raw `position:fixed` without this class.

```html
<div id="myModal" class="modal-overlay">
    <div style="background:var(--bg-glass); border:1px solid var(--border-color); border-radius:16px; padding:clamp(20px,3vw,40px); width:clamp(320px,90vw,700px); max-height:90vh; overflow-y:auto; display:flex; flex-direction:column; gap:20px; position:relative;">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
            <h3 style="margin:0; font-size:clamp(14px,1.3vw,18px); color:var(--text-heading); text-transform:uppercase; letter-spacing:2px;">Modal Title</h3>
            <button class="icon-btn" onclick="closeMyModal()">✕</button>
        </div>
        <!-- Body -->
        <div style="flex-grow:1;">
            <!-- content -->
        </div>
        <!-- Footer -->
        <div style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid var(--border-color); padding-top:12px;">
            <button class="btn-blue" onclick="submitMyModal()">Confirm</button>
            <button class="btn-red" style="background:transparent;" onclick="closeMyModal()">Cancel</button>
        </div>
    </div>
</div>
```

```javascript
function openMyModal() { document.getElementById('myModal').style.display = 'flex'; }
function closeMyModal() { document.getElementById('myModal').style.display = 'none'; }
```

---

## 11. Unified Telemetry SOP Editor Pattern

The universal standard for all SOP Compilation across Hubs relies exclusively on the **Telemetry Split-Pane Architecture** coupled with the proprietary Neogleamz markdown syntax compiler.

**Core Rules & Data State:**
- **No Data Fragmentation:** Never use deep arrays of objects `[{text: "...", m1: {url:"..."}}]` for complex workflow step storage. SOPs must be saved natively into a single global string column leveraging the raw Fulfillz telemetry format: `#`, `>`, `[IMG:url]`, `[VID:]`, `[PDF:]`, `[SCAN:tag]`, `[BARCODE:val]`, `[QR:url]`, and `[INPUT]`. 
- **Required DOM Architecture:** Layout MUST be a dual split-pane interface. Utilize our standard `.h-resizer` global wrapper pattern.
- **Workflow State Loop:** User interaction must hook a raw left-pane Text Area `.value` input driving an asynchronous, near-instant HTML parsing loop projected onto a pure right-pane Live Telemetry Output window.
- **Standardized Headers:** The active modal header MUST utilize `btn-*` styled metadata navigation tags (Audit Log, Bucket Media Injection, Guide Modal).

---

## 12. Standard Utility Classes Reference

| Class | Purpose |
|---|---|
| `.pane-header-bar` | Executive pane header (flex row, transparent bg) |
| `.pane-header-title` | Orange centered pane title |
| `.pane-header-actions` | Right-aligned button group in header |
| `.h-resizer` | Horizontal split-pane drag divider (teal) |
| `.modal-overlay` | Fixed full-screen glassmorphic modal backdrop |
| `.btn-blue` `.btn-green` `.btn-red` `.btn-orange` | Standard colored action buttons |
| `.icon-btn` | Small circular icon-only button |
| `.empty-state` | Centered empty table/data state message |
| `.section-hdr` | Orange uppercase section label within pane content |
| `.bom-layout` | Two-column layout (sidebar + main) inside panes |
| `.bom-sidebar` | Left sidebar within bom-layout |
| `.bom-main` | Main content area within bom-layout |
| `.product-list` | Styled `<ul>` list for sidebar item navigation |
| `.product-list li.selected` | Active/selected item in sidebar list |
| `.status-badge` | Pill badge; add `.st-queued` `.st-active` `.st-completed` `.st-failed` |
| `.hub-card` | Landing page hub entry card |
| `.kpi-row` | Single KPI row inside a hub-card |
| `.panel-card` | Interior content card with border-left accent |
| `.table-wrap` | Scrollable table container |

---

## 13. New Hub / Module Checklist

Before committing any new hub, page, or module:

- [ ] `tab-content` div has `style="padding:0;"`
- [ ] Hub panes use `.pane-header-bar` + `.pane-header-title` (centered title)
- [ ] All split-pane dividers use `.h-resizer` or `.v-resizer`
- [ ] No `custom-scroll` or local `::-webkit-scrollbar` declarations
- [ ] No hardcoded `px` heights on layout containers
- [ ] No Tailwind CSS utility classes anywhere
- [ ] All toggle/show/hide uses `element.style.display` — not `.classList.toggle('hidden')`
- [ ] Button colors use `btn-*` classes — no inline JS hover hacks
- [ ] All backgrounds/text use `var(--*)` tokens
- [ ] New modals use `.modal-overlay` class
- [ ] Multi-select dropdowns use custom panel pattern (Section 7), not `<select multiple>`

---

## 14. Infrastructure & Connectivity Reference

> **This section is mandatory reading for any AI agent or developer before making backend changes.**
> All credentials are stored in `.env.local` (never committed to GitHub).

### Supabase Project

| Field | Value |
|---|---|
| **Project Ref** | `qefmeivpjyaukbwadgaz` |
| **Project URL** | `https://qefmeivpjyaukbwadgaz.supabase.co` |
| **Dashboard** | https://supabase.com/dashboard/project/qefmeivpjyaukbwadgaz |
| **SQL Editor** | https://supabase.com/dashboard/project/qefmeivpjyaukbwadgaz/sql/new |
| **Storage** | https://supabase.com/dashboard/project/qefmeivpjyaukbwadgaz/storage/buckets |
| **Anon / Publishable Key** | `sb_publishable_-wsts8Q7fKRYZiDV4n2vMg_-R7Ud3l7` (safe in client JS) |
| **Service Role Key** | In `.env.local` as `SUPABASE_SERVICE_ROLE_KEY` — **NEVER expose in JS or commit to git** |

### Supabase Client (in-page, all modules)

```javascript
// Already initialized in index.html inline <script> — do NOT re-initialize in modules
const supabaseClient = window.supabase.createClient(
    'https://qefmeivpjyaukbwadgaz.supabase.co',
    'sb_publishable_-wsts8Q7fKRYZiDV4n2vMg_-R7Ud3l7',
    { auth: { storage: window.sessionStorage, autoRefreshToken: true, persistSession: true } }
);
// All module .js files access this via the global `supabaseClient` variable
```

### Supabase CLI (available via npx)

```powershell
npx supabase --version          # verify installed
npx supabase login              # browser-based auth (opens supabase.com)
npx supabase link --project-ref qefmeivpjyaukbwadgaz  # link project
npx supabase db push            # push local migrations
npx supabase db pull            # pull remote schema
```

**For admin API calls without CLI login** (bucket creation, etc.), use the service role key directly:
```powershell
$headers = @{
    'apikey' = $env:SUPABASE_SERVICE_ROLE_KEY
    'Authorization' = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
    'Content-Type' = 'application/json'
}
Invoke-RestMethod -Method POST -Uri 'https://qefmeivpjyaukbwadgaz.supabase.co/storage/v1/bucket' -Headers $headers -Body '{"id":"bucket-name","name":"bucket-name","public":true}'
```

### Key Supabase Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `sales_ledger` | All customer orders / fulfillment | `order_id`, `internal_recipe_name`, `storefront_sku`, `qty_sold`, `internal_fulfillment_status`, `qa_cleared_at`, `qa_telemetry_data` |
| `pack_ship_sops` | Packerz SOP blueprints | `internal_recipe_name` (PK), `instruction_json`, `required_box_sku` |
| `sop_archives` | QA-passed SOP snapshots (immutable) | `id`, `order_id`, `internal_recipe_name`, `qa_passed_at`, `packer_telemetry`, `sop_snapshot` |
| `production_sops` | Makerz work order SOPs | `product_name` (PK), `steps` (jsonb array) |
| `inventory_consumption` | Inventory ledger | `item_key`, `consumed_qty`, `produced_qty`, `sold_qty` |
| `catalog` | Product/BOM catalog | `name`, `bom`, `labor`, `pricing`, `is_subassembly` |
| `print_queue` | 3D print jobs | `product_name`, `qty`, `status` |

### Key Supabase Storage Buckets

| Bucket | Public | Purpose |
|---|---|---|
| `sop-media` | ✅ Yes | Images embedded in Packerz SOP checklists via `[IMG:url]` token |

**Access rules:**
- `SELECT` (reads) — public — any URL can load images (required for [IMG:url] rendering)
- `INSERT` (uploads) — `authenticated` only — must be logged into the app
- `DELETE` — `authenticated` only

**Public URL pattern:** `https://qefmeivpjyaukbwadgaz.supabase.co/storage/v1/object/public/{bucket}/{filename}`

**Upload pattern (client-side):**
```javascript
const { error } = await supabaseClient.storage.from('sop-media').upload(path, file, { cacheControl: '3600', upsert: false });
const { data } = supabaseClient.storage.from('sop-media').getPublicUrl(path);
const publicUrl = data.publicUrl;
```

---

### GitHub Repository

| Field | Value |
|---|---|
| **Repo** | `Neogleamz/neogleamz.github.io` |
| **Live URL** | https://neogleamz.github.io |
| **Default branch** | `main` (protected — requires explicit user approval to push) |
| **Local path** | `C:\Users\Chriviper\OneDrive - Neogleamz\Accounting - General\Expenses\GitHub\neogleamz.github.io` |

### Git Branching Rules (from `/git_workflow.md`)

- **NEVER push to `main`** without explicit user verbal approval
- All work goes on `feature/` or `fix/` branches
- Merge flow: `git checkout main` → `git merge feature/branch-name` → `git push origin main`
- Force push to origin requires `--no-verify` flag due to PowerShell pre-push hook
- Push uses: `& "C:\Program Files\Git\bin\git.exe" push origin main --no-verify`

### Module File Map

| File | Purpose |
|---|---|
| `index.html` | All HTML structure + inline `<script>` for global vars, Supabase init, utility functions |
| `production-module.js` | Makerz tab: work orders, SOPs, 3D print queue, BOM |
| `packerz-module.js` | Packerz tab: packing queue, SOP viewer, QA telemetry, SOP admin |
| `fulfillz-module.js` | Fulfillz tab: shipping, tracking |
| `neogleamz-engine.js` | CEO dashboard KPI engine |
| `.agents/workflows/` | AI agent workflow definitions (git, UI standards) |
| `.env.local` | Local secrets — **never commit** |

---

## 15. AI Agent Tooling & System Capabilities (Antigravity)

As an AI engineering assistant on the Neogleamz platform, I operate with **native executing privileges** on the host environment. I do not just suggest code; I execute it.

When delegating tasks, you can rely on the following built-in OS capabilities:
1. **GitHub CLI / Git Core:** I can read branches, stage patches, run `git diff`, and push commits directly to the remote repository. (Example: `git commit -m "feat: updated UI"`)
2. **Supabase CLI:** I can interface with Supabase locally using `npx supabase` commands to manage edge functions, database pushing/pulling, and schema verification.
3. **AST Parsers:** I use Abstract Syntax Tree and semantic search tools locally to identify UI standards and module patterns.
4. **Command Constraints:** I am bound by strict "avoid raw bash" system rules when dedicated tools (like `multi_replace_file_content`) exist to prevent race conditions. If you see repetitive thought-logs about tool selection in the UI, that is a required safety protocol, not a limitation of capability.

---

## 16. Standard Item Type Typography & Emojis

Across the Neogleamz ecosystem, whenever an item's archetype is designated visually, it MUST use these standardized emojis for absolute consistency (as seen in Makerz Recipez and Fulfillz Barcodz):

- **Retail Product:** `📦` (Package)
- **Sub-Assembly:** `⚙️` (Gear)
- **3D Print:** `🖨️` (Printer)
- **Raw Material / Component:** `🔩` (Nut and Bolt)

> **Note:** These emojis MUST be used not only as list-item bullets in dropdowns, but also on physical Hub card elements to indicate item archetypes instantly.

---

## 17. Z-Index Authority Hierarchy

To prevent UI elements from overlapping chaotically (e.g., custom dropdowns clipping under modals, or headers scrolling over panels), **every new element using `z-index` must strictly adhere to this dictionary:**

| Element / Class | Z-Index Value | Rules |
|---|---|---|
| Base DOM Elements | `0` or `1` | Default positioning |
| `.h-resizer` & `.v-resizer` | `10` | Must sit above standard split panes for dragging |
| Sticky Table Headers (`<th>`) | `20` | Must stay above scrolling table rows |
| Custom `.pane-header-bar` | `50` | Must sit above scrolling content below it |
| Custom Dropdown Panels | `500` | E.g. Multi-select menus; must sit above all page content |
| `.modal-overlay` | `1000` | Full screen lockouts; overtakes entire application |
| System Alerts / Toast Banners | `2000` | Highest priority; nothing can obscure a system message |

---

## 18. Forms, Inputs & Focus States

Text inputs, numeric inputs, and textareas must remain perfectly cohesive with the dark/glass theme.

**Standard Input CSS Mandate:**
```css
input[type="text"], input[type="number"], textarea {
    background: var(--bg-input);
    border: 1px solid var(--border-input);
    color: var(--text-main);
    border-radius: 6px; /* 4px for tight spaces */
    padding: 6px 10px;
    font-size: 12px;
    outline: none; /* Crucial: no default blue chrome borders */
    transition: border-color 0.2s, box-shadow 0.2s;
}

/* Mandatory Focus State */
input[type="text"]:focus, input[type="number"]:focus, textarea:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 5px rgba(247, 147, 32, 0.4); /* Subtle brand glow */
}
```

---

## 19. Dynamic Data Tables & Sticky Headers

Tables are the backbone of Neogleamz data visualization. Ad-hoc styling is strictly prohibited.

**Table Standards:**
1. **Container:** Wrap the table in `<div class="table-wrap" style="overflow-y:auto; flex-grow:1;">`.
2. **Table Tag:** `<table class="full-table" style="width:100%; border-collapse:collapse;">`.
3. **Sticky Headers:** All tables must have sticky headers so context isn't lost on long scrolls.
4. **Row Hover:** Ensure `<tr>` rows have an explicit hover state to aid readability.

**Standard DOM Structure:**
```html
<div class="table-wrap" style="overflow-y:auto; flex-grow:1;">
    <table class="full-table" style="width:100%; border-collapse:collapse; text-align:left;">
        <thead style="position:sticky; top:0; background:var(--bg-panel); z-index:20;">
            <tr>
                <th style="padding:10px; border-bottom:2px solid var(--border-color); color:var(--primary-color); font-size:11px; text-transform:uppercase;">SKU</th>
                <th style="padding:10px; border-bottom:2px solid var(--border-color); color:var(--primary-color); font-size:11px; text-transform:uppercase;">QTY</th>
            </tr>
        </thead>
        <tbody>
            <tr style="border-bottom:1px solid var(--border-color); cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='var(--bg-input)'" onmouseout="this.style.background='transparent'">
                <td style="padding:10px; font-size:12px; color:var(--text-main);">NEO-BLTZ</td>
                <td style="padding:10px; font-size:12px; font-weight:bold; color:#10b981;">140</td>
            </tr>
        </tbody>
    </table>
</div>
```

---

## 20. Async Loading States & Data Fetching

When dispatching Supabase API queries, you **must** provide a UI lock or standard visual queue. Do not allow the user to click buttons repeatedly, and do not leave them staring at a static screen.

*   **Button Submissions:** The button element triggering the sync must mutate its state:
    ```javascript
    const btn = document.getElementById('saveBtn');
    btn.innerText = "SYNCING CLOUD...";
    btn.style.opacity = "0.6";
    btn.style.pointerEvents = "none";
    
    await supabaseClient...
    
    // On success:
    btn.innerText = "SUCCESS ✓";
    btn.style.background = "#10b981"; // Snap to green
    setTimeout(() => { reset button... }, 2000);
    ```
*   **Empty Table Data:** While querying large ledgers to populate lists, place a single temporary `<div style="padding:40px; text-align:center; color:var(--text-muted); font-style:italic;">Fetching Edge Ledgers...</div>` placeholder inside the container so it doesn't look broken.

---

## 21. Toast Notifications & System Feedback

Do not use raw browser `alert()` except for critical destructive confirmations (e.g., `let ok = confirm("Delete this SOP?")`).

For success/error feedback, rely strictly on **Button Mutation** (as seen in Section 20 above) or dedicated **in-pane status zones** (usually an empty `div` under the title).

**Standard Pane Status Message Syntax:**
```html
<div id="paneStatusLabel" style="display:none; padding:8px; margin-bottom:10px; border-radius:6px; font-size:12px; font-weight:bold; text-align:center;"></div>
```
```javascript
function showStatus(msg, isError = false) {
    const el = document.getElementById('paneStatusLabel');
    el.style.display = 'block';
    el.innerText = msg;
    el.style.background = isError ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)";
    el.style.color = isError ? "#ef4444" : "#10b981";
    el.style.border = `1px solid ${isError ? "#ef4444" : "#10b981"}`;
    setTimeout(() => el.style.display = 'none', 3500);
}
```

---

## 22. Compact Grid Matrix Cards

To ensure visual consistency for all item-level entities (e.g., Barcodz Spoolers, Labelz Selection, Recipe Parts), all cards displayed inside a repeating grid MUST follow the **Compact Grid Matrix Card** pattern.

This eliminates wasted space (like large canvas image blocks) and aligns interactions cleanly into a strict CSS Grid structure.

**Required Features:**
1. Outer wrapper uses standard panel styling with a hover border transition.
2. The Top Header uses `display:grid; grid-template-columns:auto 1fr auto; align-items:center;`.
3. Top Header layout strictly dictates:
   - **Left:** Big emoji in a dedicated square `var(--bg-input)` container.
   - **Center:** Vertically stacked or horizontally flexed pill badges (e.g. Dimensions, Stock status).
   - **Right:** Primary Action Button (e.g., Spool).
4. The Bottom Body uses `border-top`, holds the Item Name text, and ends with the Secondary/Configuration Action Button spanning 100% width.

**Template Payload:**
```html
<div style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-shadow:0 2px 4px rgba(0,0,0,0.1); transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--primary-color)'" onmouseout="this.style.borderColor='var(--border-color)'">
    
    <!-- Top Grid Layout -->
    <div style="display:grid; grid-template-columns:auto 1fr auto; align-items:center; margin-bottom:8px; gap:8px;">
        <!-- Left: Emoji Container -->
        <div style="font-size:18px; line-height:1; display:flex; align-items:center; justify-content:center; width:24px; height:24px; background:var(--bg-input); border-radius:6px;">🏷️</div>
        
        <!-- Center: Status / Data Pills -->
        <div style="display:flex; justify-content:center; align-items:center; height:100%; gap:4px;">
            <span style="display:inline-block; font-size:8px; font-weight:800; background:rgba(14,165,233,0.1); color:#0ea5e9; padding:2px 6px; border-radius:8px; text-transform:uppercase;">2.25x1.25"</span>
            <span style="display:inline-block; font-size:8px; font-weight:800; background:rgba(16,185,129,0.1); color:#10b981; padding:2px 6px; border-radius:8px; text-transform:uppercase;">STOCK: 140</span>
        </div>
        
        <!-- Right: Primary Action Button -->
        <button style="background:#3b82f6; color:white; border:none; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:10px; cursor:pointer; display:flex; align-items:center; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"><i style="margin-right:2px; font-style:normal;">➕</i> Primary</button>
    </div>
    
    <!-- Bottom Content + Secondary Action -->
    <div style="padding-top:6px; border-top:1px solid var(--border-color); text-align:center; display:flex; flex-direction:column; flex:1;">
        <div style="font-size:13px; font-weight:900; color:var(--text-heading); margin-bottom:8px; line-height:1.2; word-break:break-word; min-height:15px; display:flex; justify-content:center; align-items:center; flex:1;">Item Name String Here</div>
        
        <!-- Span-full Width Secondary Footer Button -->
        <button style="width:100%; background:var(--bg-bar); color:var(--text-main); border:1px solid var(--border-color); padding:4px 0; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer; display:flex; justify-content:center; align-items:center; transition:background 0.2s;" onmouseover="this.style.background='var(--border-color)'" onmouseout="this.style.background='var(--bg-bar)'"><i style="margin-right:4px; font-style:normal;">✏️</i> Secondary Action Edit</button>
    </div>
</div>
```

---

## 23. Global SOP Editors

To ensure unity across all Neogleamz operational modules (Packerz, Batchez, Layerz, Toolz), all SOP Blueprint UI components must strictly adhere to the unified Split-Pane pattern and the sequential button state flow. 

**Required Layout:**
- **Split-Pane Architecture:** The Editor dictates a 65/35 left/right split utilizing flex ratios. Separated by the global `.h-resizer` div.
- **Left Pane:** Includes the `Audited Telemetry Checklist` input textarea (e.g. `packerzAdminQA` or `productionAdminQA`) beside the `Live Telemetry Preview` display box.
- **Right Pane:** The legacy manual Rich Text instructions block builder (`+ ADD PROCEDURE STEP`).

**Required Feature Flow (Master Save Button):**
Every module utilizing a Master Blueprint save sequence MUST animate its trigger `<button>` to visually confirm the network event to the operator, transitioning away from background-silent loads.

The save function logic must execute this specific sequence:
```javascript
// 1. Initial Processing State
btn.innerText = "UPLOADING PROTOCOLS..."; 
btn.style.opacity = "0.5";

// 2. Await Database Call
const { error } = await supabaseClient.from('...').upsert({...});

// 3. Success State
btn.innerText = "💾 SAVED SUCCESSFULLY!";
btn.style.background = "#059669";

// 4. Revert to Idle baseline after fixed duration (3000ms)
setTimeout(() => { 
    btn.innerText = "💾 SAVE MASTER BLUEPRINT"; 
    btn.style.background = ""; 
    btn.style.opacity = "1"; 
}, 3000);
```

---

## 24. Universal Action Button UX Standardization

Any primary action button across the Neogleamz architecture that triggers an asynchronous Database/API call MUST provide direct tactile loading feedback to the operator. Silent background loading sequences are deprecated. 

**Required Flow:**
Instead of duplicating `setTimeout` state resets in every module, developers MUST utilize the global wrapper `executeWithButtonAction()` instantiated in `app.js`.

```javascript
/**
 * Wraps any async backend call in a unified, standard UX animated button flow.
 * 
 * @param {string} btnId - The ID of the HTML <button> element triggering the action.
 * @param {string} loadingStr - Status string while awaiting promise (e.g. "SYNCING...")
 * @param {string} successStr - Temporary completion string (e.g. "✅ SUCCESS!")
 * @param {Function} asyncCallback - The core async function payload.
 */
// Example Usage:
async function submitData() {
    await executeWithButtonAction('btnSubmit', 'UPLOADING...', '✅ SAVED!', async () => {
        // ... Supabase Payload Call here ...
        const { error } = await supabaseClient.from('...').upsert({});
        if (error) throw error;
    });
}
```

**UX Characteristics Enforced:**
1. Automatically prevents multi/double clicks by disabling the node.
2. Fades opacity during processing.
4. Restores DOM structure perfectly after 3000ms.

---

## 25. State Persistence & Memory in Data Tables

To prevent user frustration from repetitive layout adjustments, all dynamic data tables and sorted lists **MUST** persist their layout/sort state across page reloads using browser local storage.

**Required Pattern:**
1. **Never hardcode default states.** Always wrap the initial sort variable assignment in the global `window.getSavedSort` utility.
2. **Commit changes instantly.** Whenever the sorting metric, column, or direction is updated by a user interaction, it must immediately be committed via `window.saveSort`.

**Implementation Example:**
```javascript
// Initialization
let currentSalesSort = window.getSavedSort('currentSalesSort', { column: 'd', direction: 'desc' });

// Mutation (OnClick Handler)
function sortSales(c) { 
    if(isResizing) return; 
    currentSalesSort = { column: c, direction: currentSalesSort.column===c && currentSalesSort.direction==='asc' ? 'desc' : 'asc' }; 
    window.saveSort('currentSalesSort', currentSalesSort); // Mandatory Hook
    renderSalesTable(); 
}
```

---

## 26. Protocol: Immutable Source Data

To guarantee **Source-Aware Accounting** across the Neogleamz ecosystem, any raw data imported from external systems (Shopify, Salez, Orders, Parcels) MUST be physically rendered as strictly immutable, read-only UI components in ledgers and datagrid tables.

**Core Directives:**
1. **Never use `contenteditable="true"` or `.editable` CSS classes** on source data columns (e.g., Sale Date, Order ID, Storefront SKU, Actual Price, Shipping Collected, Raw Shopify Total).
2. **Never allow users to manually type over or alter imported strings** to fix discrepancies. 
3. **Data Corrections MUST be Algorithmic:** If financial data requires correction (e.g., an order was an exchange, or revenue needs stripping), do NOT rewrite the raw value in the database. Instead, expose secondary Engine variables (like `transaction_type` dropdowns: IGNORE, Warranty, Exchange) that the Master Engine can use to *mathematically derive* the corrected net metrics down the pipeline.
4. **Visual Accountability:** The UI Table must mathematically resemble the exact original string provided by the import CSV, providing a guaranteed source-of-truth baseline before Engine derivations take over.

---

## 27. Version Bumping Protocol

Any time a new feature, fix, or architectural change is implemented and pushed to the `main` branch, you **MUST** bump the system version string in `system-version.js` to reflect the date and time of the build.

**Example:**
`const NEOGLEAMZ_VERSION = "v.2026.04.05.0937";`

This guarantees that the `NEOGLEAMZ_VER` local storage watcher correctly triggers the "System Updated: [old] -> [new]" log in the terminal, providing the user and all web clients absolute confirmation that their browser cache has successfully pulled the latest deployment. Failure to bump this string will result in silent cache-lock confusion.

---

## 28. Local Testing & Verification Guidelines

To ensure the "Zero-Risk Workflow" is maintained, you must follow strict testing validation protocols before requesting user approval to merge.

**Core Directives:**
1. **Local Domain Validation:** Every feature branch MUST be tested by the user loading `127.0.0.1:5500` or clicking the `Go Live` server to verify the UI and functionality. Never assume code works blindly.
2. **Flexbox & Edge Case Checking:** Always verify the visual boundaries of newly added UI constraints (e.g., test long text wrapping in fixed-width Flex containers, ensure buttons don't unpredictably stretch with `flex: 1` or get clipped by `max-width` restrictions). 
3. **Cache Awareness:** Before deploying to `main`, instruct the user that GitHub Pages enforces a 3-5 minute CI/CD delay and a hard network refresh (Ctrl+F5 / Cmd+Shift+R) is strictly required on the live `.com` URL to defeat Service Worker/Browser Caching.

---

## 29. Archive Explorer Standard

All archive views across the Neogleamz platform **MUST** use the unified accordion-card pattern defined here. Partial adoption (e.g., a flat list in one module, accordion in another) is a critical failure of this standard.

### Required Structure

Every archived record is rendered as an `.archive-card` with two zones:
1. **Header** — always visible, contains status pill, ID, title, meta, and chevron. Clicking it toggles the detail zone.
2. **Detail** — collapsed by default. Contains timestamps, label, metadata rows, and the hard-delete button.

```html
<div class="archive-card">
    <!-- Always-visible header -->
    <div class="archive-card-header" onclick="toggleArchiveDetail('arc-N')">
        <div class="archive-card-status completed">✓ COMPLETED</div>
        <div class="archive-card-id">WO-123456</div>
        <div class="archive-card-title">"Holiday Rush" — SK8Lytz Unit</div>
        <div class="archive-card-meta">x12 · Apr 5, 2026</div>
        <div class="archive-card-chevron" id="arc-N-chev">▶</div>
    </div>
    <!-- Collapsible detail (display:none by default) -->
    <div class="archive-card-detail" id="arc-N" style="display:none; flex-direction:column;">
        <div class="archive-card-detail-row"><span>Label:</span><strong>"Holiday Rush"</strong></div>
        <div class="archive-card-detail-row"><span>Started:</span><strong>Apr 4, 2026 8:00 AM</strong></div>
        <div class="archive-card-detail-row"><span>Completed:</span><strong>Apr 5, 2026 2:30 PM</strong></div>
        <button class="btn-red" style="width:auto; margin-top:12px; align-self:flex-start;">🗑️ Hard Delete</button>
    </div>
</div>
```

### CSS Classes (defined in `index.html` global `<style>`)

| Class | Purpose |
|---|---|
| `.archive-card` | Wrapper — border, hover, border-color transition |
| `.archive-card-header` | Flex row, clickable, hover tint |
| `.archive-card-status` | Status pill (add `.completed`, `.manual`, or `.print` modifier) |
| `.archive-card-id` | Monospace ID (WO-XXXXX, PR-XXXXXXXX) |
| `.archive-card-title` | Truncated title with label prefix if set |
| `.archive-card-meta` | Qty + date summary, right-aligned |
| `.archive-card-chevron` | ▶ rotates 90° when `.open` class is toggled |
| `.archive-card-detail` | Hidden detail zone — `flex-direction:column` |
| `.archive-card-detail-row` | Key/value row — `span` for label, `strong` for value |

### Required Features

- **Search filter** — every archive explorer MUST include a text input that filters by ID, name, and label in real time using `filterArchiveList(q)`.
- **Data cache** — store the full unfiltered dataset in `_archiveFullData` before rendering so the filter doesn't require a DB re-query.
- **Toggle function** — always use `toggleArchiveDetail(id)` from `production-module.js` (global scope).
- **Hard Delete placement** — the 🗑️ Hard Delete button MUST live inside the `.archive-card-detail` zone, **never** in the `.archive-card-header`. This prevents accidental destructive taps.
- **Label display** — if a record has a `label` field set, display it as `"label text" — Title` in the `.archive-card-title` and as a detail row. If null, omit both.

### Status Pill Modifiers

| Modifier | Color | Use Case |
|---|---|---|
| `.completed` | `#10b981` green | Record was fully worked through the pipeline |
| `.manual` | `#f59e0b` amber | Record was manually archived before completion |
| `.print` | `#8b5cf6` purple | 3D print job archive (LAYERZ) |

### JavaScript Pattern

```javascript
let _archiveFullData = [];

function renderArchiveList() {
    const searchEl = document.getElementById('archiveSearchInput');
    if (searchEl) searchEl.value = '';
    _archiveFullData = /* filter your DB for status === 'Archived' */;
    _renderArchiveCards(_archiveFullData);
}

function filterArchiveList(q) {
    if (!q || !q.trim()) { _renderArchiveCards(_archiveFullData); return; }
    const lq = q.toLowerCase();
    _renderArchiveCards(_archiveFullData.filter(r =>
        (r.id_field || '').toLowerCase().includes(lq) ||
        (r.name_field || '').toLowerCase().includes(lq) ||
        (r.label || '').toLowerCase().includes(lq)
    ));
}

function _renderArchiveCards(items) { /* build .archive-card HTML and set listArea.innerHTML */ }
```
