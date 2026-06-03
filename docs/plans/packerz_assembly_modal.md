# Implementation Plan: Packerz Assembly Verification Modal

## 1. Objective
Replace the native `window.confirm()` dialog used during the Packerz assembly completion process with a custom, rich Vanilla JS modal. The new modal will visually break down standard inventory deductions versus ignored/exchange items based on the current transaction states in the Supabase ledger.

## 2. Pre-Requisites
- Data fetch must be hoisted above the user prompt.
- Modal must be visually consistent with existing `index.css` glassmorphism classes.
- Modal must use Promise-based async execution to mimic synchronous `confirm()` blocking behavior.
- DOM injection must be secured against XSS using `window.safeHTML()`.
- Elements must be properly garbage collected upon promise resolution.

## 3. Execution Steps

### Step 3.1: Implement `showPackerzCompletionModal` Helper
In `assets/js/packerz-module.js`, define the new modal builder function:
```javascript
function showPackerzCompletionModal(orderId, lineItems) {
    return new Promise((resolve) => {
        let standardItems = [];
        let ignoredItems = [];

        lineItems.forEach(r => {
            const isIgnored = r.transaction_type === 'IGNORE' || 
                              r.transaction_type === 'Pre-Ship Exchange' || 
                              r.transaction_type === 'Post-Ship Exchange';
            if (isIgnored) {
                ignoredItems.push(r);
            } else {
                standardItems.push(r);
            }
        });

        let html = `
            <div class="glass-panel" style="width:clamp(320px, 90vw, 500px); max-height:90vh; padding:25px; display:flex; flex-direction:column; gap:10px;">
                <h3 style="margin-top:0; color:var(--text-heading); border-bottom:1px solid var(--border-color); padding-bottom:10px;">Confirm Assembly: Order ${orderId}</h3>
                <p style="color:var(--text-muted); font-size:13px;">Please review the inventory actions below.</p>
                
                <div style="overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:8px; margin-bottom:15px;">
                    <strong style="color:var(--text-heading);">Standard Items (Deducting Inventory):</strong>
                    ${standardItems.map(i => `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:8px; border-radius:6px;">
                            <span style="font-weight:bold;">${i.qty_sold}x ${i.internal_recipe_name}</span>
                            <span class="status-badge st-completed">DEDUCTING</span>
                        </div>
                    `).join('') || '<div style="color:var(--text-muted); font-size:12px;">None</div>'}

                    <strong style="color:#F59E0B; margin-top:10px;">Ignored / Exchange (No Deduction):</strong>
                    ${ignoredItems.map(i => `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:8px; border-radius:6px;">
                            <span style="color:var(--text-muted);">${i.qty_sold}x ${i.internal_recipe_name}</span>
                            <span class="status-badge st-queued">${i.transaction_type}</span>
                        </div>
                    `).join('') || '<div style="color:var(--text-muted); font-size:12px;">None</div>'}
                </div>

                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                    <button id="btnCancelModal" class="btn-secondary" style="padding:8px 16px;">Cancel</button>
                    <button id="btnConfirmModal" class="btn-green-neon" style="padding:8px 16px;">Confirm & Complete</button>
                </div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.innerHTML = window.safeHTML(html);

        document.body.appendChild(overlay);

        const cleanup = (result) => {
            overlay.remove(); 
            resolve(result);
        };

        overlay.querySelector('#btnCancelModal').addEventListener('click', () => cleanup(false));
        overlay.querySelector('#btnConfirmModal').addEventListener('click', () => cleanup(true));
    });
}
```

### Step 3.2: Refactor `executePackerzCompletion`
Locate `executePackerzCompletion` in `assets/js/packerz-module.js` (around line 1189).
1. Remove the native `confirm()` check.
2. Hoist the `sales_ledger` fetch to occur immediately.
3. Await the `showPackerzCompletionModal` response.
4. Execute the rest of the existing completion logic if confirmed, utilizing the already fetched `lineItems`.

## 4. Verification
1. Open the Packerz SOP viewer for an active order.
2. Change some items to "IGNORE" or "Pre-Ship Exchange".
3. Click "ASSEMBLY COMPLETE".
4. Verify the new custom modal displays the exact configuration.
5. Click "Confirm & Complete".
6. Verify inventory deducts properly for standard items only.
7. Verify clicking "Cancel" removes the modal and halts execution without memory leaks.
