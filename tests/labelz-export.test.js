/* global initFabricCanvas */
const fs = require('fs');
const path = require('path');

describe('Labelz PDF Export', () => {
    let createdImage = null;
    let originalImage = null;

    afterEach(() => {
        global.Image = originalImage;
    });

    beforeEach(() => {
        document.body.innerHTML = `
            <input type="text" id="labelzDesignerSize" value="2.25x1.25" data-custom-size="2.25x1.25">
            <select id="labelzOrientation">
                <option value="Portrait">Portrait</option>
                <option value="Landscape">Landscape</option>
            </select>
            <div id="printableBarcodeArea"></div>
        `;

        // Mock window.print to simulate native dialog close
        window.print = jest.fn(() => {
            const event = document.createEvent('Event');
            event.initEvent('afterprint', true, true);
            window.dispatchEvent(event);
        });

        // Mock safeHTML
        window.safeHTML = (html) => html;

        // Mock window.fabric
        window.fabric = {
            Canvas: jest.fn(() => window.fCanvas)
        };

        // Mock fCanvas
        window.fCanvas = {
            on: jest.fn(),
            discardActiveObject: jest.fn(),
            renderAll: jest.fn(),
            toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mocked_base64'),
            getObjects: jest.fn().mockReturnValue(['mock_element'])
        };

        originalImage = global.Image;
        global.Image = class {
            constructor() {
                this._src = '';
                this.onload = null;
                createdImage = this;
            }
            set src(val) {
                this._src = val;
                if (this.onload) this.onload();
            }
            get src() {
                return this._src;
            }
        };

        // Load the function script manually
        let scriptContent = fs.readFileSync(path.resolve(__dirname, '../assets/js/labelz-module.js'), 'utf-8');
        eval(scriptContent);
        
        initFabricCanvas();
    });

    test('verifies Portrait orientation logic', () => {
        document.getElementById('labelzOrientation').value = 'Portrait';
        
        window.exportLabelzPDF();

        // Trigger load to populate DOM
        const printArea = document.getElementById('printableBarcodeArea');
        
        // Capture DOM state right before print clears it
        const originalPrint = window.print;
        let capturedHtml = '';
        window.print = jest.fn(() => {
            capturedHtml = printArea.innerHTML;
            originalPrint();
        });

        createdImage.onload(); // Manually trigger load

        expect(capturedHtml).toContain('img src="data:image/png;base64,mocked_base64"');
        expect(capturedHtml).not.toContain('transform: rotate(90deg)');
        expect(window.print).toHaveBeenCalled();
        expect(printArea.innerHTML).toBe(''); // Verify cleanup worked
    });

    test('verifies Landscape orientation logic applies 90-degree CSS transform', () => {
        document.getElementById('labelzOrientation').value = 'Landscape';
        
        window.exportLabelzPDF();

        const printArea = document.getElementById('printableBarcodeArea');
        
        const originalPrint = window.print;
        let capturedHtml = '';
        window.print = jest.fn(() => {
            capturedHtml = printArea.innerHTML;
            originalPrint();
        });

        createdImage.onload(); // Manually trigger load

        expect(capturedHtml).toContain('img src="data:image/png;base64,mocked_base64"');
        expect(capturedHtml).toContain('transform: rotate(90deg)');
        expect(window.print).toHaveBeenCalled();
        expect(printArea.innerHTML).toBe(''); // Verify cleanup worked
    });
    
    test('verifies jsPDF is removed', () => {
        const scriptContent = fs.readFileSync(path.resolve(__dirname, '../assets/js/labelz-module.js'), 'utf-8');
        expect(scriptContent).not.toContain('jspdf');
        expect(scriptContent).not.toContain('jsPDF');
        expect(scriptContent).toContain('window.print()');
    });
});
