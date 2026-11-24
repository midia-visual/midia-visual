import {previewSource} from './images.js';
import {restoreCart, summarizeCart, validQuantity, buildMessage} from '../shared/cart.js';
import {money} from '../shared/product.js';
import {$, bindDialog, escapeHTML, toast} from './dom.js';

const storageKey = 'midia-visual-cart-v1';
const emptyCart = `<div class="empty">Sua sacola está esperando boas ideias.<br>
  Escolha seus favoritos no catálogo.<br>
  <button class="button" id="continue-shopping">Explorar catálogo ↗</button></div>`;

function cartRow({item, product, price}, index) {
  const quantityId = item.color ? `color-qty-${index}` : `qty-${escapeHTML(product.id)}`;
  const name = escapeHTML(product.name);
  const color = item.color && escapeHTML(item.color);
  const pricing = price === null ? 'Valor sob consulta' :
    `${money(price)} / ${escapeHTML(product.unit)} · ${money(price * item.quantity)}`;
  return `<article class="cart-item">
    <img ${previewSource(product.images[0])} alt="${name}">
    <div><h3>${name}</h3>${color ? `<p>Cor: ${color}</p>` : ''}<p>${pricing}</p>
      <label for="${quantityId}">Quantidade${product.minimumSpecified ? ' · mínimo ' + product.minimumQuantity : ''}</label>
      <div class="quantity">
        <input id="${quantityId}" data-quantity="${index}" type="number" min="${product.minimumQuantity}" max="99999" step="1" value="${item.quantity}">
        <button class="remove" data-remove="${index}" aria-label="Remover ${name}${color ? ' · ' + color : ''}">Remover</button>
      </div>
    </div>
  </article>`;
}

export function bindCartDialog() {
  const dialog = $('#cart');
  $('#open-cart').addEventListener('click', () => dialog.showModal());
  bindDialog(dialog, $('#close-cart'));
}

export function initCart(productsById, store) {
  let saved = null;
  try { saved = localStorage.getItem(storageKey); } catch { /* Storage is optional. */ }
  const cart = restoreCart(saved, productsById);
  const items = $('#cart-items');

  function render() {
    const {lines, total, quantity, unknown} = summarizeCart(cart, productsById);
    $('#cart-count').textContent = quantity;
    $('#open-cart').setAttribute('aria-label', `Abrir sacola, ${quantity} unidades`);
    items.innerHTML = lines.length ? lines.map(cartRow).join('') : emptyCart;
    $('#cart-checkout').hidden = !lines.length;
    $('.total span').textContent = unknown ? 'Subtotal conhecido' : 'Total dos produtos';
    $('#total').textContent = money(total) + (unknown ? ' + sob consulta' : '');
  }

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch { /* Keep the cart in memory. */ }
    render();
  }

  items.addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (button) {
      cart.splice(Number(button.dataset.remove), 1);
      persist();
    }
    if (event.target.closest('#continue-shopping')) {
      $('#cart').close();
      $('#catalogo').scrollIntoView();
    }
  });
  items.addEventListener('change', event => {
    const item = cart[event.target.dataset.quantity];
    if (!item) return;
    item.quantity = validQuantity(event.target.value, productsById.get(item.id));
    persist();
  });
  $('#checkout').addEventListener('click', () => {
    if (!cart.length) return;
    const message = buildMessage(cart, productsById, $('#notes').value, store.name);
    window.open(`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  });

  render();
  return function addToCart(button) {
    const product = productsById.get(button.dataset.add);
    const color = button.parentElement.querySelector('.color-picker select')?.value || undefined;
    const existing = cart.find(item => item.id === product.id && item.color === color);
    if (existing) existing.quantity = validQuantity(existing.quantity + product.minimumQuantity, product);
    else cart.push({id: product.id, quantity: product.minimumQuantity, color});
    persist();
    toast(`${product.name} adicionado à sacola`);
  };
}
