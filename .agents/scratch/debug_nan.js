let x = { transaction_fees: "0.48", actualShipCost: 8.00 };
let u_stripeFee = parseFloat(x.transaction_fees) || 0;
let u_actualShipCost = x.actualShipCost;

console.log("u_stripeFee", u_stripeFee);
console.log("u_actualShipCost", u_actualShipCost);

let net = 0 - u_actualShipCost - u_stripeFee;
console.log("net", net);

let oTot = 0; let fStat = "refunded";
console.log(oTot === 0 && fStat.toLowerCase() !== 'refunded')
