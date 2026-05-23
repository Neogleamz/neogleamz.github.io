const fs = require('fs');
const path = require('path');

let scriptContent = fs.readFileSync(path.resolve(__dirname, '../assets/js/labelz-module.js'), 'utf-8');
scriptContent = scriptContent.replace('let fCanvas = null;', 'let fCanvas = window.mockCanvas;');
scriptContent = scriptContent.replace('if(!fCanvas) return;', ''); // bypass

const { JSDOM } = require('jsdom');
const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
        <body>
            <input type="text" id="labelzDesignerSize" value="2.25x1.25" data-custom-size="2.25x1.25">
            <select id="labelzOrientation">
                <option value="Landscape">Landscape</option>
            </select>
            <div id="printableBarcodeArea"></div>
        </body>
    </html>
`, { runScripts: "dangerously" });

const window = dom.window;
const document = window.document;

window.print = () => { console.log("window.print() called"); };
window.safeHTML = (html) => html;
window.mockCanvas = {
    discardActiveObject: () => {},
    renderAll: () => {},
    toDataURL: () => 'data:image/png;base64,mocked_base64'
};

const scriptEl = document.createElement('script');
scriptEl.textContent = scriptContent;
document.body.appendChild(scriptEl);

window.exportLabelzPDF();

const printArea = document.getElementById('printableBarcodeArea');
console.log("INNER HTML:\n", printArea.innerHTML);
