const { JSDOM } = require('jsdom');
const dom = new JSDOM();
const div = dom.window.document.createElement('div');
div.innerHTML = '<img style="transform: rotate(90deg); transform-origin: center;">';
console.log(div.innerHTML);
