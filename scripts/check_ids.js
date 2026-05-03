const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const ids = ['input-name', 'input-location', 'input-region', 'input-contact', 'input-style', 'input-type', 'input-collab-tier', 'input-collab-status', 'input-summary', 'input-viral', 'input-favorite', 'input-ig', 'input-ig-link', 'input-ig-followers', 'input-tt', 'input-tt-link', 'input-tt-followers', 'input-yt', 'input-yt-link', 'input-yt-followers', 'input-fb', 'input-fb-link', 'input-fb-followers'];
const missing = ids.filter(id => !html.includes('id="'+id+'"'));
console.log('Missing IDs:', missing);
