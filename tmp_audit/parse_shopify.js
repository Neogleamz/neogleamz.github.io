const XLSX = require('xlsx');

const workbook = XLSX.readFile('C:\\Users\\Chriviper\\Downloads\\shopify_ordersFULL.xlsx');
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(firstSheet, {defval: ""});

let diffs = [];
let globalShopifyRaw = 0;
let globalEngineNet = 0;

let orderGroups = {};
let orderFirstRowFlags = {};

rows.forEach(r => {
    let orderId = r['Name'] || r['Order Name'] || r['Order ID'] || r['Order Number'] || r['Order'] || '';
    let skuName = r['Lineitem name'] || r['Item Name'] || r['Title'] || r['Product Name'] || '';
    let qty = parseFloat(r['Lineitem quantity'] || r['Quantity'] || r['Qty'] || 0);
    let price = parseFloat(r['Lineitem price'] || r['Price'] || r['Item Price'] || 0);
    
    if(!orderId || !skuName || qty <= 0) return;

    let subTot = 0, ship = 0, tax = 0, discCode = "", discAmt = 0, tot = 0;
    let isFirstRow = false;
    if (!orderFirstRowFlags[orderId]) {
        isFirstRow = true;
        subTot = parseFloat(String(r['Subtotal'] || "0").replace(/[^0-9.-]+/g,"")) || 0;
        ship = parseFloat(String(r['Shipping'] || "0").replace(/[^0-9.-]+/g,"")) || 0;
        tax = parseFloat(String(r['Taxes'] || "0").replace(/[^0-9.-]+/g,"")) || 0;
        discAmt = parseFloat(String(r['Discount Amount'] || "0").replace(/[^0-9.-]+/g,"")) || 0;
        tot = parseFloat(String(r['Total'] || "0").replace(/[^0-9.-]+/g,"")) || 0;
        let bal = parseFloat(String(r['Outstanding Balance'] || r['Balance'] || "0").replace(/[^0-9.-]+/g,"")) || 0;
        orderFirstRowFlags[orderId] = { balance: bal, total: tot }; 
    }

    if (!orderGroups[orderId]) {
        orderGroups[orderId] = { lines: [], balance: orderFirstRowFlags[orderId].balance, reportedTotal: orderFirstRowFlags[orderId].total };
    }

    orderGroups[orderId].lines.push({
        name: skuName,
        actual_sale_price: price,
        qty_sold: qty,
        shipping: isFirstRow ? ship : 0, // In Shopify CSV, the shipping is typically only listed on the first row
        taxes: isFirstRow ? tax : 0,
        discount_amount: isFirstRow ? discAmt : 0,
        total: isFirstRow ? tot : 0
    });
});

Object.keys(orderGroups).forEach(oid => {
    let groupTokens = orderGroups[oid];
    let group = groupTokens.lines;
    
    let shopifyRawTotal = groupTokens.reportedTotal; // The total Shopify claimed for this order
    
    // Compute True Line Captured per Neogleamz Logic
    let engineCapturedTotal = 0;
    
    let hasZeroPriceItem = group.some(r => parseFloat(r.actual_sale_price || 0) === 0);

    group.forEach(r => {
        let p = parseFloat(r.actual_sale_price || 0);
        let q = parseFloat(r.qty_sold || 0);
        let s = parseFloat(r.shipping || 0);
        let t = parseFloat(r.taxes || 0);
        let d = parseFloat(r.discount_amount || 0);
        
        let trueLineCaptured = (p * q) + s + t - d;
        engineCapturedTotal += trueLineCaptured;
    });

    // Automated Exchange Logic (Subtract Outstanding Balances if it was a $0 replacement)
    let exchAdj = 0;
    if (group.length > 1 && hasZeroPriceItem && groupTokens.balance > 0) {
        // Find if this is a true exchange (a $0 item next to a standard item)
        exchAdj = -groupTokens.balance;
    }
    
    engineCapturedTotal += exchAdj;

    let discrepancy = shopifyRawTotal - engineCapturedTotal;
    
    // Format output
    if (Math.abs(discrepancy) > 0.01) {
        diffs.push({
            Order: oid,
            ShopifyReported: shopifyRawTotal,
            EngineCaptured: engineCapturedTotal,
            OutstandingBalance: groupTokens.balance,
            Difference: discrepancy
        });
    }

    globalShopifyRaw += shopifyRawTotal;
    globalEngineNet += engineCapturedTotal;
});

console.log(JSON.stringify({ diffs, globalShopifyRaw, globalEngineNet }, null, 2));
