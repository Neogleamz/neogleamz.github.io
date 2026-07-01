'use strict';
const https  = require('https');
const http   = require('http');
const crypto = require('crypto');

const CDN_SCRIPTS = [
  { label: 'supabase-js@2.110.0',           pinnedUrl: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.0' },
  { label: 'xlsx-0.20.1',                    pinnedUrl: 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js' },
  { label: 'chart.js@4.5.1-umd',            pinnedUrl: 'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js' },
  { label: 'chartjs-plugin-datalabels@2.0.0', pinnedUrl: 'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0' },
  { label: 'dompurify@3.0.5',               pinnedUrl: 'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.5/purify.min.js' },
  { label: 'html5-qrcode@2.3.8-head',       pinnedUrl: 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js' },
  { label: 'sortablejs@1.15.7',             pinnedUrl: 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.7/Sortable.min.js' },
  { label: 'jsbarcode@3.11.6',              pinnedUrl: 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js' },
  { label: 'qrcode@1.4.4',                  pinnedUrl: 'https://cdn.jsdelivr.net/npm/qrcode@1.4.4/build/qrcode.min.js' },
  { label: 'html5-qrcode@2.3.8-bottom',     pinnedUrl: 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js' },
  { label: 'fabric@7.4.0',                  pinnedUrl: 'https://cdn.jsdelivr.net/npm/fabric@7.4.0/dist/index.min.js' },
  { label: 'bwip-js@3.4.1',                pinnedUrl: 'https://cdnjs.cloudflare.com/ajax/libs/bwip-js/3.4.1/bwip-js-min.js' },
  { label: 'jspdf@4.2.1',                   pinnedUrl: 'https://unpkg.com/jspdf@4.2.1/dist/jspdf.umd.min.js' },
];

function fetchBytes(rawUrl) {
  return new Promise((resolve, reject) => {
    function doGet(currentUrl, hops) {
      if (hops === 0) return reject(new Error('Too many redirects: ' + rawUrl));
      const parsed = new URL(currentUrl);
      const lib = parsed.protocol === 'https:' ? https : http;
      lib.get(currentUrl, { headers: { 'User-Agent': 'sri-generator/1.0' } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith('http') ? res.headers.location : parsed.origin + res.headers.location;
          res.destroy(); return doGet(next, hops - 1);
        }
        if (res.statusCode !== 200) { res.destroy(); return reject(new Error(`HTTP ${res.statusCode} for ${currentUrl}`)); }
        const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve(Buffer.concat(chunks))); res.on('error', reject);
      }).on('error', reject);
    }
    doGet(rawUrl, 5);
  });
}

async function main() {
  console.log('Fetching and hashing CDN scripts...\n');
  const results = await Promise.all(CDN_SCRIPTS.map(async entry => {
    const bytes = await fetchBytes(entry.pinnedUrl);
    const hash = crypto.createHash('sha384').update(bytes).digest('base64');
    return { ...entry, integrity: `sha384-${hash}` };
  }));
  results.forEach(r => {
    console.log(`\n[${r.label}]`);
    console.log(`  integrity="${r.integrity}"`);
    console.log(`  <script src="${r.pinnedUrl}" integrity="${r.integrity}" crossorigin="anonymous"></script>`);
  });
  console.log('\nJSON:\n' + JSON.stringify(results.map(r => ({ label: r.label, pinnedUrl: r.pinnedUrl, integrity: r.integrity })), null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
