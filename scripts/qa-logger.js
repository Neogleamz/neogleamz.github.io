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
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                if (data.action === 'clear') {
                    // Delete all .md files in LOG_DIR
                    const files = fs.readdirSync(LOG_DIR);
                    for (const file of files) {
                        if (file.endsWith('.md')) {
                            fs.unlinkSync(path.join(LOG_DIR, file));
                        }
                    }
                    console.log('Cleared old reports.');
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: true }));
                }

                // Sanitize filename
                const safeRes = data.resolution.replace(/[^a-z0-9x-]/gi, '_');
                const filename = `qa-report-${safeRes}.md`;
                
                // Append to the file so it builds up across Hubs
                const filepath = path.join(LOG_DIR, filename);
                fs.appendFileSync(filepath, data.markdown + '\n');
                
                console.log(`Updated report: ${filename}`);
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
