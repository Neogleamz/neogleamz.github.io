const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 4000;
const DUMPS_DIR = path.join(__dirname, '..', 'supabase', 'dumps');

// Ensure dumps directory exists
if (!fs.existsSync(DUMPS_DIR)) {
    fs.mkdirSync(DUMPS_DIR, { recursive: true });
}

let currentStreamRes = null;

function streamOut(msg) {
    if (currentStreamRes) {
        currentStreamRes.write(msg);
    }
}

function log(msg) {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] ${msg}`;
    console.log(formatted);
    streamOut(formatted + '\n');
}

function runCommand(command, args, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
        log(`Executing: ${command} ${args.join(' ')}`);
        const proc = spawn(command, args, { cwd, shell: true });
        
        proc.stdout.on('data', (data) => {
            const str = data.toString();
            process.stdout.write(str);
            streamOut(str);
        });
        
        proc.stderr.on('data', (data) => {
            const str = data.toString();
            process.stderr.write(str);
            streamOut(str);
        });
        
        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with code ${code}`));
        });
    });
}

const server = http.createServer(async (req, res) => {
    // Log incoming requests
    log(`Incoming request: ${req.method} ${req.url}`);

    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': 2592000
    };

    if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        res.end();
        return;
    }

    if (req.url === '/ping' && req.method === 'GET') {
        res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'online', port: PORT }));
        return;
    }

    if (req.url === '/api/sandbox/backup-and-start' && req.method === 'POST') {
        res.writeHead(200, { ...headers, 'Content-Type': 'text/plain', 'Transfer-Encoding': 'chunked' });
        currentStreamRes = res;

        try {
            log(`=== STARTING SANDBOX WORKFLOW ===`);
            log(`Step 0: Checking local data cache...`);
            
            const schemaFile = path.join(__dirname, '..', 'supabase', 'migrations', '00000000000000_schema.sql');
            const seedFile = path.join(__dirname, '..', 'supabase', 'seed.sql');
            
            if (fs.existsSync(schemaFile) && fs.existsSync(seedFile)) {
                log(`[CACHE HIT] Found existing local clone data. Skipping download to save bandwidth!`);
            } else {
                log(`Step 1: Pulling live database structure (Schema)...`);
                fs.mkdirSync(path.join(__dirname, '..', 'supabase', 'migrations'), { recursive: true });
                await runCommand('npx', ['supabase', 'db', 'dump', '-f', schemaFile]);
                
                log(`Step 2: Dumping live database data to seed.sql...`);
                await runCommand('npx', ['supabase', 'db', 'dump', '--data-only', '-f', seedFile]);
                
                const seedContent = fs.readFileSync(seedFile, 'utf8');
                fs.writeFileSync(seedFile, "SET session_replication_role = 'replica';\n\n" + seedContent);
            }
            
            log(`Step 3: Injecting .env secrets into Sandbox...`);
            const rootEnv = path.join(__dirname, '..', '.env');
            const supEnv = path.join(__dirname, '..', 'supabase', '.env');
            const supEnvLocal = path.join(__dirname, '..', 'supabase', '.env.local');
            const supFuncEnvLocal = path.join(__dirname, '..', 'supabase', 'functions', '.env.local');
            if (fs.existsSync(rootEnv)) {
                fs.copyFileSync(rootEnv, supEnv);
                fs.copyFileSync(rootEnv, supEnvLocal);
                fs.mkdirSync(path.join(__dirname, '..', 'supabase', 'functions'), { recursive: true });
                fs.copyFileSync(rootEnv, supFuncEnvLocal);
            }
            
            log(`Step 4: Starting local Docker Sandbox...`);
            await runCommand('npx', ['supabase', 'start']);
            
            log(`=== SANDBOX READY! ===`);
            log(`You can now safely test using the local database.`);
        } catch (error) {
            log(`❌ ERROR: ${error.message}`);
        }
        res.end();
        currentStreamRes = null;
        return;
    }

    if (req.url === '/api/vault/sql-backup' && req.method === 'POST') {
        res.writeHead(200, { ...headers, 'Content-Type': 'text/plain', 'Transfer-Encoding': 'chunked' });
        currentStreamRes = res;

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const schemaFile = path.join(DUMPS_DIR, `schema_${timestamp}.sql`);
            const dataFile = path.join(DUMPS_DIR, `data_${timestamp}.sql`);
            
            log(`=== STARTING FULL SQL BACKUP ===`);
            log(`Step 1: Dumping LIVE Schema to ${schemaFile}...`);
            await runCommand('npx', ['supabase', 'db', 'dump', '-f', schemaFile]);
            
            log(`Step 2: Dumping LIVE Data to ${dataFile}...`);
            await runCommand('npx', ['supabase', 'db', 'dump', '--data-only', '-f', dataFile]);
            
            log(`Step 3: Hardening data dump against circular foreign keys...`);
            const sqlContent = fs.readFileSync(dataFile, 'utf8');
            fs.writeFileSync(dataFile, "SET session_replication_role = 'replica';\n\n" + sqlContent);
            
            log(`=== SQL BACKUP SUCCESSFUL! ===`);
        } catch (error) {
            log(`❌ ERROR: ${error.message}`);
        }
        res.end();
        currentStreamRes = null;
        return;
    }

    if (req.url === '/api/vault/sql-backups' && req.method === 'GET') {
        try {
            const files = fs.readdirSync(DUMPS_DIR).filter(f => f.endsWith('.sql'));
            res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ backups: files }));
        } catch(e) {
            res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    if (req.url === '/api/vault/sql-restore' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            res.writeHead(200, { ...headers, 'Content-Type': 'text/plain', 'Transfer-Encoding': 'chunked' });
            currentStreamRes = res;

            try {
                const { file, target } = JSON.parse(body);
                const filePath = path.join(DUMPS_DIR, file);
                
                log(`=== STARTING SQL RESTORE ===`);
                log(`Targeting: ${target.toUpperCase()}`);
                log(`File: ${file}`);
                
                if (target === 'sandbox') {
                    // Restore to local
                    await runCommand('docker', ['run', '--rm', '-i', '-v', `"${DUMPS_DIR}:/dumps"`, 'postgres:latest', 'psql', '"postgresql://postgres:postgres@host.docker.internal:54322/postgres"', '-f', `"/dumps/${file}"`]);
                } else if (target === 'production') {
                    // We can't safely restore to production via local docker without the URI
                    log(`⚠️ To restore to LIVE PRODUCTION, you must run this manually in terminal using psql:`);
                    log(`psql -h aws-0-REGION.pooler.supabase.com -p 6543 -d postgres -U postgres.PROJECT_REF -f "${filePath}"`);
                    throw new Error("Live restore blocked for safety. Must use psql natively.");
                }
                
                log(`=== SQL RESTORE SUCCESSFUL! ===`);
            } catch (error) {
                log(`❌ ERROR: ${error.message}`);
            }
            res.end();
            currentStreamRes = null;
        });
        return;
    }

    res.writeHead(404);
    res.end();
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n=================================================`);
    console.log(`🟢 NEOGLEAMZ ENGINE ONLINE - AWAITING COMMANDS...`);
    console.log(`=================================================\n`);
    console.log(`Listening on http://127.0.0.1:${PORT}`);
    console.log(`Keep this window open while testing.\n`);
});
