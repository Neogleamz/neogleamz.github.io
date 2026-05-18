// test.js
const _fs = require('fs');

// simulate the process
let oFulfill = "pending";
let rFulfill = "fulfilled";
console.log((oFulfill === 'pending' || oFulfill === 'unfulfilled') && (rFulfill === 'fulfilled' || rFulfill === ''));
