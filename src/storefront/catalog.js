import {normalize} from '../shared/product.js';
import {$, escapeHTML} from './dom.js';
import {productCard} from './product-view.js';

const pageSize = 12;
const collator = new Intl.Collator('pt-BR');
const sortOrders = {
  name: (a, b) => collator.compare(a.name, b.name),
  'price-up': (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
  'price-down': (a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity),
};

export function initCatalog(products, showProduct, addToCart) {
  const list = $('#products');
  const categories = $('#categories');
  const search = $('#search');
  const sort = $('#sort');
  const loadMore = $('#load-more');
  const entries = products.map(product => ({
    product,
    text: normalize([product.name, product.category, product.description, product.id].join(' ')),
  }));
  let category = 'Todos';
  let matches = [];
  let visible = 0;

  function nextPage() {
    const page = matches.slice(visible, visible + pageSize);
    list.insertAdjacentHTML('beforeend', page.map(productCard).join(''));
    visible += page.length;
    loadMore.hidden = visible >= matches.length;
    const label = matches.length === 1 ? 'produto encontrado' : 'produtos encontrados';
    $('#results').textContent = `${visible} de ${matches.length} ${label}`;
  }

  function refresh() {
    const query = normalize(search.value);
    matches = entries.filter(({product, text}) =>
      (category === 'Todos' || product.category === category) && text.includes(query)
    ).map(entry => entry.product);
    if (sortOrders[sort.value]) matches.sort(sortOrders[sort.value]);
    visible = 0;
    list.innerHTML = matches.length ? '' :
      '<p class="empty">Nenhum produto encontrado. Experimente outra busca ou categoria.</p>';
    nextPage();
  }

  categories.innerHTML = ['Todos', ...new Set(products.map(p => p.category))].map(name =>
    `<button data-category="${escapeHTML(name)}" aria-pressed="${name === 'Todos'}">${escapeHTML(name)}</button>`
  ).join('');
  categories.addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    category = button.dataset.category;
    for (const item of categories.children) item.setAttribute('aria-pressed', String(item === button));
    refresh();
  });
  search.addEventListener('input', refresh);
  sort.addEventListener('change', refresh);
  loadMore.addEventListener('click', () => {
    const firstNew = visible;
    nextPage();
    list.children[firstNew]?.querySelector('button')?.focus({preventScroll: true});
  });
  list.addEventListener('click', event => {
    const details = event.target.closest('[data-detail]');
    if (details) showProduct(details.dataset.detail);
    const button = event.target.closest('[data-add]');
    if (button) addToCart(button);
  });
  refresh();
}
