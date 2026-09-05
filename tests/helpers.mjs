import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

export function stubGlobal(t, name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; });
}

export function composerDOM(t) {
  const dom = new JSDOM(readFileSync(new URL('../promo.html', import.meta.url), 'utf8'), { url: 'http://localhost/' });
  t.after(() => dom.window.close());
  for (const name of ['window', 'document', 'Node', 'Event', 'Option', 'localStorage', 'getComputedStyle']) stubGlobal(t, name, name === 'window' ? dom.window : dom.window[name]);
  const controls = Object.fromEntries([...document.querySelectorAll('[id]')].map(element => [element.id, element]));
  controls.glyphGrid = document.querySelector('#glyph-grid');
  return { dom, controls };
}

export function canvasContexts(t, window) {
  const contexts = new Map();
  let reads = 0;
  t.mock.method(window.HTMLCanvasElement.prototype, 'getContext', function () {
    if (!contexts.has(this)) {
      const context = { canvas: this, calls: [], imageSmoothingEnabled: false };
      for (const method of ['clearRect', 'fillRect', 'strokeRect', 'drawImage', 'save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'stroke', 'fill', 'rect', 'clip', 'translate', 'scale', 'rotate']) {
        context[method] = (...args) => context.calls.push([method, ...args]);
      }
      context.getImageData = (_x, _y, width, height) => {
        reads += 1;
        const data = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < data.length; i += 4) data.set([24, 29, 48, 255], i);
        return { data, width, height };
      };
      context.putImageData = () => {};
      contexts.set(this, context);
    }
    return contexts.get(this);
  });
  return { contexts, get reads() { return reads; } };
}
