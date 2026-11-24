import {enableOriginalFallback} from './images.js';
import {indexProducts} from '../shared/product.js';
import {initCatalog} from './catalog.js';
import {initDetails} from './product-view.js';
import {initCart, bindCartDialog} from './cart-view.js';
import {$} from './dom.js';

function applyConfig(config) {
  if (!/^\d{10,15}$/.test(config.whatsapp) || !config.name) throw Error('Configuração inválida');
  for (const link of document.querySelectorAll('[data-whatsapp]')) {
    link.href = `https://wa.me/${config.whatsapp}`;
    link.hidden = false;
  }
  const phone = config.whatsapp.replace(/^55(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  for (const label of document.querySelectorAll('[data-store-phone]')) label.textContent = phone;
  if (config.instagram) {
    const url = new URL(config.instagram);
    if (url.protocol === 'https:') {
      for (const link of document.querySelectorAll('[data-instagram]')) {
        link.href = url.href;
        link.hidden = false;
      }
    }
  }
}

async function fetchJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw Error('Falha ao carregar ' + path);
  return response.json();
}

async function load() {
  let store;
  try {
    const [config, catalog] = await Promise.allSettled([
      fetchJSON('./config.json'), fetchJSON('./data/products.json'),
    ]);
    if (config.status === 'rejected') throw config.reason;
    applyConfig(config.value);
    store = config.value;
    if (catalog.status === 'rejected') throw catalog.reason;
    const products = catalog.value;
    const productsById = indexProducts(products);
    const addToCart = initCart(productsById, store);
    const showProduct = initDetails(productsById, addToCart);
    initCatalog(products, showProduct, addToCart);
  } catch {
    $('#results').textContent = 'Não foi possível carregar o catálogo.';
    $('#products').innerHTML = '<p>Recarregue a página para tentar novamente.</p>';
    if (store) {
      const link = document.createElement('a');
      link.href = `https://wa.me/${store.whatsapp}`;
      link.textContent = 'Fale conosco pelo WhatsApp';
      $('#products').append(link);
    }
    $('#cart-items').textContent = 'Catálogo indisponível. Recarregue a página para tentar novamente.';
    $('#cart-checkout').hidden = true;
  }
}

$('#year').textContent = new Date().getFullYear();
enableOriginalFallback();
bindCartDialog();
load();
