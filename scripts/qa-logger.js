const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5501;
const LOG_DIR = path.join(__dirname, '..', 'docs', 'qa-reports');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                if (data.action === 'clear') {
                    if (fs.existsSync(LOG_DIR)) {
                        fs.rmSync(LOG_DIR, { recursive: true, force: true });
                    }
                    fs.mkdirSync(LOG_DIR, { recursive: true });
                    console.log('Cleared all reports.');
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: true }));
                }

                // Sanitize parameters
                const safeRes = data.resolution ? data.resolution.replace(/[^a-z0-9x-]/gi, '_') : 'unknown';
                const hub = data.hub ? data.hub.replace(/[^a-z0-9-]/gi, '_') : 'Base_Hubs';
                const page = data.page ? data.page.replace(/[^a-z0-9-]/gi, '_') : 'Main';
                const modal = data.modal ? data.modal.replace(/[^a-z0-9-]/gi, '_') : null;

                // Build path hierarchy
                let targetDir = path.join(LOG_DIR, hub, page);
                if (modal) targetDir = path.join(targetDir, modal);

                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                const filename = `qa-report-${safeRes}.md`;
                const filepath = path.join(targetDir, filename);
                
                fs.appendFileSync(filepath, data.markdown + '\n');
                
                console.log(`Updated report: ${hub}/${page}${modal ? '/' + modal : ''}/${filename}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                console.error(e);
                res.writeHead(500);
                res.end();
            }
        });
    }
}).listen(PORT, () => {
    console.log(`QA Logger active on http://127.0.0.1:${PORT}`);
    console.log(`Appending reports to: docs/qa-reports/`);
});
