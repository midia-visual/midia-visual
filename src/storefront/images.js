import {escapeHTML} from './dom.js';

export function previewSource(source) {
  const original = escapeHTML(source);
  const local = /^assets\/products\/([^/]+\.webp)$/i.exec(source);
  if (!local) return `src="${original}"`;
  return `src="assets/products/thumbs/${escapeHTML(local[1])}" data-original="${original}"`;
}

export function enableOriginalFallback() {
  document.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.dataset.original) return;
    const original = image.dataset.original;
    delete image.dataset.original;
    image.src = original;
  }, true);
}
