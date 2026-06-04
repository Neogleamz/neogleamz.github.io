const assert = require('assert');

const APP_TABLES = [
    { tableName: 'table1' }
];

const IGNORED_TABLES = [
    'ignored1'
];

function testGuardrail(activeTables) {
    if (!activeTables) {
        throw new Error("Cannot map over null/undefined");
    }
    const validAppTables = APP_TABLES.map(t => t.tableName);
    const activeTableNames = activeTables.map(t => t.table_name);
    
    const unhandledTables = activeTableNames.filter(t => !validAppTables.includes(t) && !IGNORED_TABLES.includes(t));
    
    if (unhandledTables.length > 0) {
        throw new Error(`FATAL EXPORT ERROR: Unhandled active tables found: ${unhandledTables.join(', ')}. Please update APP_TABLES or IGNORED_TABLES.`);
    }
    return true;
}

// 1. Success case
testGuardrail([
    { table_name: 'table1' },
    { table_name: 'ignored1' }
]);

// 2. Unhandled table case
try {
    testGuardrail([
        { table_name: 'table1' },
        { table_name: 'unhandled1' }
    ]);
    assert.fail("Should have thrown");
} catch(e) {
    assert.match(e.message, /Unhandled active tables found: unhandled1/);
}

// 3. activeTables is null
try {
    testGuardrail(null);
    assert.fail("Should have handled null");
} catch(e) {
    console.error("Null activeTables throws:", e.message);
}

console.log("All manual checks ran.");
