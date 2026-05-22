const fs = require('fs');
let code = fs.readFileSync('assets/js/system-event-delegator.js', 'utf8');

function injectCase(code, eventType, caseStr) {
    let searchStr = "document.body.addEventListener('" + eventType + "', function(event) {";
    let startIndex = code.indexOf(searchStr);
    if (startIndex === -1) return code;
    
    let switchStr = "switch(action) {";
    let switchIndex = code.indexOf(switchStr, startIndex);
    if (switchIndex === -1) return code;
    
    let insertIndex = switchIndex + switchStr.length;
    return code.slice(0, insertIndex) + "\n                " + caseStr + code.slice(insertIndex);
}

let clickCase = `case 'click_renderSimulatorOrder':
                    if (typeof window.renderSimulatorOrder === 'function') window.renderSimulatorOrder(el.getAttribute('data-oid'));
                    break;`;

let changeCase = `case 'change_updateSaleType':
                    if (typeof window.updateSaleType === 'function') window.updateSaleType(el, el.getAttribute('data-order'), el.getAttribute('data-sku'));
                    break;`;

let blurCase = `case 'blur_updateSaleCell':
                    if (typeof window.updateSaleCell === 'function') window.updateSaleCell(el, el.getAttribute('data-order'), el.getAttribute('data-sku'), el.getAttribute('data-col'), el.getAttribute('data-isnum') === 'true');
                    break;`;

let focusCase = `case 'focus_storeOldVal':
                    if (typeof window.storeOldVal === 'function') window.storeOldVal(el);
                    break;`;

code = injectCase(code, 'click', clickCase);
code = injectCase(code, 'change', changeCase);
code = injectCase(code, 'blur', blurCase);
code = injectCase(code, 'focus', focusCase);

fs.writeFileSync('assets/js/system-event-delegator.js', code);
console.log('Delegator modified.');
