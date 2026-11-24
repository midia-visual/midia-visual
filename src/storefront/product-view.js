import {previewSource} from './images.js';
import {colorName, money} from '../shared/product.js';
import {$, bindDialog, escapeHTML} from './dom.js';

function colorPicker(product, id) {
  if (!product.colors?.length) return '';
  const options = product.colors.map(color => {
    const name = escapeHTML(colorName(color));
    return `<option value="${name}">${name}</option>`;
  });
  return `<div class="color-picker"><label for="${id}">Cor</label>
    <select id="${id}"><option value="">Sem preferência</option>${options.join('')}</select></div>`;
}

function priceAndMinimum(p) {
  const price = p.price === null ? 'Sob consulta' : `${money(p.price)} <small>/ ${escapeHTML(p.unit)}</small>`;
  const minimum = p.minimumSpecified ? `Mínimo de ${p.minimumQuantity} unidades` : 'Consulte condições do pedido';
  return `<p class="price">${price}</p><p class="minimum">${minimum}</p>`;
}

export function productCard(p) {
  return `<article class="product-card">
    <button class="product-image detail-trigger" data-detail="${escapeHTML(p.id)}" aria-label="Ver detalhes de ${escapeHTML(p.name)}">
    <img ${previewSource(p.images[0])} alt="${escapeHTML(p.name)}" loading="lazy" width="750" height="750">${p.description.includes('Sob encomenda')?'<span class="product-tag">SOB ENCOMENDA</span>':''}<span class="details-label">Ver detalhes ↗</span>
    </button>
    <p class="category">${escapeHTML(p.category)}</p>
    <h3>${escapeHTML(p.name)}</h3>${p.description?`<p class="description">${escapeHTML(p.description)}</p>`:''}${priceAndMinimum(p)}
    ${colorPicker(p,`card-color-${escapeHTML(p.id)}`)}<button class="add" data-add="${escapeHTML(p.id)}">Adicionar à sacola <span aria-hidden="true">＋</span>
    </button>
    </article>`;
}

export function initDetails(productsById, addToCart) {
  const dialog = $('#product-detail');
  const content = $('#detail-content');
  bindDialog(dialog, $('#close-detail'));
  content.addEventListener('click', event => {
    const add = event.target.closest('[data-add]');
    if (add) return addToCart(add);
    const thumbnail = event.target.closest('[data-image-index]');
    if (!thumbnail) return;
    const product = productsById.get(thumbnail.dataset.product);
    const index = Number(thumbnail.dataset.imageIndex);
    const image = $('#detail-image');
    image.src = product.images[index];
    image.alt = `${product.name} — foto ${index + 1} de ${product.images.length}`;
    for (const button of content.querySelectorAll('[data-image-index]')) {
      button.setAttribute('aria-pressed', String(button === thumbnail));
    }
  });

  return function showProduct(id) {
    const p = productsById.get(id);
    content.innerHTML = `<div class="detail-gallery">
    <img id="detail-image" class="detail-image" src="${escapeHTML(p.images[0])}" alt="${escapeHTML(p.name)} — foto 1 de ${p.images.length}">
    <div class="thumbnails" aria-label="Fotos do produto">${p.images.length>1?p.images.map((image,index)=>`<button data-image-index="${index}" data-product="${escapeHTML(p.id)}" aria-label="Ver foto ${index+1} de ${p.images.length}" aria-pressed="${index===0}">
    <img ${previewSource(image)} alt="" loading="lazy">
    </button>`).join(''):''}</div>
    </div>
    <div class="detail-info">
    <p class="eyebrow">${escapeHTML(p.category)}</p>
    <h2 id="detail-title">${escapeHTML(p.name)}</h2>
    <p class="detail-code">Código ${escapeHTML(p.id)}</p>
    <p class="description">${escapeHTML(p.description)}</p>${priceAndMinimum(p)}
    ${colorPicker(p,'detail-color')}<button class="button" data-add="${escapeHTML(p.id)}">Adicionar à sacola ＋</button>
    </div>`;
    dialog.showModal();
  };
}
