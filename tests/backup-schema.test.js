const fs = require('fs');
const path = require('path');

describe('executeExport Guardrail', () => {
    let mockSupabaseClient;

    beforeEach(() => {
        // Setup mock environment
        window.alert = jest.fn();
        window.sysLog = jest.fn();
        window.setMasterStatus = jest.fn();
        window.executeWithButtonAction = jest.fn(async (id, t1, t2, cb) => {
            await cb();
        });
        window.XLSX = {
            utils: {
                book_new: jest.fn(() => ({})),
                json_to_sheet: jest.fn(),
                book_append_sheet: jest.fn()
            },
            writeFile: jest.fn()
        };

        mockSupabaseClient = {
            rpc: jest.fn(),
            from: jest.fn()
        };
        window.supabaseClient = mockSupabaseClient;

        // Load the module
        const scriptContent = fs.readFileSync(path.resolve(__dirname, '../assets/js/system-tools-module.js'), 'utf-8');
        eval(scriptContent);
    });

    test('should throw error and alert if unhandled tables exist', async () => {
        mockSupabaseClient.rpc.mockResolvedValue({
            data: [
                { table_name: 'full_landed_costs' },
                { table_name: 'product_recipes' },
                { table_name: 'dummy_unknown_table' }
            ],
            error: null
        });

        await window.executeExport();
        
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('dummy_unknown_table'));
        expect(window.sysLog).toHaveBeenCalledWith(expect.stringContaining('FATAL EXPORT ERROR'), true);
        expect(window.setMasterStatus).toHaveBeenCalledWith('Export Error', 'mod-error');
        expect(window.XLSX.writeFile).not.toHaveBeenCalled();
    });

    test('should succeed if all tables are handled', async () => {
        mockSupabaseClient.rpc.mockResolvedValue({
            data: [
                { table_name: 'full_landed_costs' },
                { table_name: 'product_recipes' },
                { table_name: 'label_designs' } // in IGNORED_TABLES
            ],
            error: null
        });

        mockSupabaseClient.from.mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: [], error: null })
        });

        await window.executeExport();
        
        expect(window.alert).not.toHaveBeenCalled();
        expect(window.sysLog).not.toHaveBeenCalledWith(expect.stringContaining('FATAL EXPORT ERROR'), true);
        expect(window.XLSX.writeFile).toHaveBeenCalled();
    });
});
