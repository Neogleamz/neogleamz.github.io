// ==============================================
// NEXUZ TERMINAL: ORDERZ MODULE
// ==============================================
// Responsible for tracking exact Shopify Orders with expanded metadata

let ordersDB = [];

window.initOrderzCore = function() {
    sysLog("Booting ORDERZ Sub-Core...");
    ordersDB = (window._sysSalesLedgerCache || []).filter(s => s.order_id);
    sysLog(`ORDERZ Sync complete: ${ordersDB.length} lines detected.`);
    window.renderOrderzTable();
};

window.renderOrderzTable = function() {
    const listBody = document.getElementById('orderzList');
    if (!listBody) return;

    if (!ordersDB || ordersDB.length === 0) {
        listBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 50px; color: var(--text-muted);">No Order Data Found in Ledger.</td></tr>`;
        return;
    }

    let html = '';
    // Reverse chron sort
    let sorted = [...ordersDB].sort((a,b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());

    // Take top 100 to avoid locking DOM if it's large
    sorted.slice(0, 100).forEach(order => {
        let fStatus = order.financial_status || 'UNKNOWN';
        let fBadge = fStatus.toLowerCase() === 'paid' ? `<span style="color:#10b981; font-weight:bold;">PAID</span>` : `<span style="color:#f59e0b;">${fStatus}</span>`;
        
        let pStatus = order.fulfillment_status || 'UNFULFILLED';
        let pBadge = pStatus.toLowerCase() === 'fulfilled' ? `<span style="color:#10b981;">DONE</span>` : `<span style="color:#ef4444; font-weight:bold;">${pStatus}</span>`;

        html += `
            <tr style="border-bottom: 1px solid var(--border-color); font-size: 13px;">
                <td style="color: var(--text-heading); font-weight: bold;">${order.order_id || 'N/A'}</td>
                <td style="color: var(--text-muted);">${order.sale_date || 'N/A'}</td>
                <td style="color: #0ea5e9;">${order.internal_recipe_name || order.storefront_sku || 'Item'}</td>
                <td class="text-right" style="font-weight: 900; color: #f97316;">${order.qty_sold || 0}</td>
                <td class="text-right" style="color: var(--text-muted);">${order.shipping_city || 'N/A'}, ${order.shipping_province || 'N/A'}</td>
                <td class="text-center">${fBadge}</td>
                <td class="text-center">${pBadge}</td>
            </tr>
        `;
    });

    listBody.innerHTML = html;
};

// Listen for global dataset refresh
document.addEventListener('neogleamzSystemDatasetReady', () => {
    // If the active tab is orders, re-init. Usually Neogleamz engine loads it all into window._sysSalesLedgerCache
    if (document.getElementById('ordersScreen').style.display !== 'none') {
        window.initOrderzCore();
    }
});
