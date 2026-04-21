const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const purify = DOMPurify(window);
const dirty = '<button data-click="test" data-index="5"><svg><path d="M1"/></svg></button>';
const clean = purify.sanitize(dirty, { ADD_ATTR: ['target'] });
console.log(clean);
