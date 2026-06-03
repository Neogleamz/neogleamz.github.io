const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><script src='https://unpkg.com/html5-qrcode'></script>`, { runScripts: 'dangerously', resources: 'usable' });
setTimeout(() => {
    console.log(Object.keys(dom.window.Html5QrcodeSupportedFormats || {}));
}, 2000);
