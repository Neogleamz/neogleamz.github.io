const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
console.log(DOMPurify.sanitize('<iframe loading="lazy" src="https://drive.google.com/file/d/12345/preview" style="width:100%; height:100%; border:none; pointer-events:none;"></iframe>', {
    ADD_TAGS: ['iframe', 'video', 'source'],
    ADD_ATTR: ['target', 'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'muted', 'playsinline', 'preload', 'autoplay', 'loop', 'data-url', 'data-click', 'data-mousedown', 'contenteditable', 'src', 'loading', 'class', 'style', 'selected', 'value', 'checked', 'type']
}));
