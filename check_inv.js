let inventoryDB = {};
const sizeText = 'Dymo 2.25" x 1.25"';

async function testIt() {
    let qty = 1;
    if(!inventoryDB[sizeText]) {
         inventoryDB[sizeText] = { consumed_qty: 0, manual_adjustment: 0, produced_qty: 0, sold_qty: 0, min_stock: 0, scrap_qty: 0, prototype_consumed_qty: 0, assembly_consumed_qty: 0, production_consumed_qty: 0, prototype_produced_qty: 0 };
    }
    
    inventoryDB[sizeText].production_consumed_qty += qty;
    inventoryDB[sizeText].consumed_qty += qty;
    
    const payload = {
         item_key: sizeText,
         consumed_qty: inventoryDB[sizeText].consumed_qty || 0,
         manual_adjustment: inventoryDB[sizeText].manual_adjustment || 0,
         produced_qty: inventoryDB[sizeText].produced_qty || 0,
         sold_qty: inventoryDB[sizeText].sold_qty || 0,
         min_stock: inventoryDB[sizeText].min_stock || 0,
         scrap_qty: inventoryDB[sizeText].scrap_qty || 0,
         prototype_consumed_qty: inventoryDB[sizeText].prototype_consumed_qty || 0,
         assembly_consumed_qty: inventoryDB[sizeText].assembly_consumed_qty || 0,
         production_consumed_qty: inventoryDB[sizeText].production_consumed_qty,
         prototype_produced_qty: inventoryDB[sizeText].prototype_produced_qty || 0
    };
    console.log("PAYLOAD IS =>", JSON.stringify(payload, null, 2));
}

testIt();
