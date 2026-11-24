import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const products = JSON.parse(readFileSync(new URL('../../data/products.json', import.meta.url)));
const config = JSON.parse(readFileSync(new URL('../../config.json', import.meta.url)));
const storageKey = 'midia-visual-cart-v1';
const cards = page => page.locator('.product-card');
const add = (page, product) => page.locator(`[data-add="${product.id}"]`).click();
const openCart = page => page.getByRole('button', {name: /^Abrir sacola/}).click();

async function showAll(page, total=products.length) {
  for(let count=12;count<total;count+=12) await page.getByRole('button', {name: 'Exibir mais produtos'}).click();
  await expect(cards(page)).toHaveCount(total);
}

async function load(page) {
  await page.goto('/');
  await expect(cards(page)).toHaveCount(Math.min(12, products.length));
  await showAll(page);
}

test('catálogo busca sem acentos, filtra por categoria e mostra estado vazio', async ({page}) => {
  await load(page);
  const product = products[0];
  await page.getByRole('searchbox').fill(product.id);
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).getByRole('heading')).toHaveText(product.name);
  await page.getByRole('searchbox').fill('produto inexistente xyz');
  await expect(cards(page)).toHaveCount(0);
  await expect(page.locator('#products')).toContainText('Nenhum produto encontrado');
  const accented = products.find(p => /[áéíóúãõç]/i.test(p.name));
  await page.getByRole('searchbox').fill(accented.name.normalize('NFD').replace(/\p{Diacritic}/gu, ''));
  await expect(cards(page).filter({has: page.getByRole('heading', {name: accented.name, exact: true})})).toHaveCount(1);
  await page.getByRole('searchbox').fill('');
  await page.locator('#categories').getByRole('button', {name: product.category, exact: true}).click();
  await showAll(page, products.filter(p => p.category === product.category).length);
  await expect(page.locator('#categories [aria-pressed="true"]')).toHaveText(product.category);
});

for (const [sort, compare] of [
  ['name', (a, b) => a.name.localeCompare(b.name, 'pt-BR')],
  ['price-up', (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)],
  ['price-down', (a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity)],
]) {
  test(`ordenação ${sort}`, async ({page}) => {
    await load(page);
    await page.getByRole('combobox', {name: 'Ordenar'}).selectOption(sort);
    await expect(cards(page)).toHaveCount(Math.min(12, products.length));
    await showAll(page);
    await expect(cards(page).locator('h3')).toHaveText([...products].sort(compare).map(p => p.name));
  });
}

test('detalhes permitem adicionar o produto à sacola e fechar pelo teclado', async ({page}) => {
  await load(page);
  const product = products[0];
  await page.locator(`[data-detail="${product.id}"]`).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading')).toHaveText(product.name);
  await expect(dialog.locator('#detail-image')).toHaveAttribute('src', product.images[0]);
  await dialog.getByRole('button', {name: /Adicionar à sacola/}).click();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await openCart(page);
  await expect(page.locator(`#qty-${product.id}`)).toHaveValue(String(product.minimumQuantity));
});

test('sacola acumula itens, respeita mínimo, persiste e remove', async ({page}) => {
  await load(page);
  const product = products[0];
  await add(page, product);
  await add(page, product);
  await openCart(page);
  await expect(page.locator(`#qty-${product.id}`)).toHaveValue(String(product.minimumQuantity * 2));
  await page.locator(`#qty-${product.id}`).fill('0');
  await page.locator('#cart-title').click();
  await expect(page.locator(`#qty-${product.id}`)).toHaveValue(String(product.minimumQuantity));
  await page.reload();
  await expect(cards(page)).toHaveCount(Math.min(12, products.length));
  await showAll(page);
  await openCart(page);
  await expect(page.locator(`#qty-${product.id}`)).toHaveValue(String(product.minimumQuantity));
  await page.getByRole('button', {name: `Remover ${product.name}`, exact: true}).click();
  await expect(page.locator('#cart-checkout')).toBeHidden();
  await expect(page.locator('#cart-items')).toContainText('Sua sacola está esperando');
  await expect(page.locator('#cart-count')).toHaveText('0');
  await page.getByRole('button', {name: /Explorar catálogo/}).click();
  await expect(page.locator('#cart')).not.toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe('[]');
});

test('pedido inclui desconto, itens sob consulta e observações no WhatsApp', async ({page}) => {
  await page.addInitScript(() => { window.open = (...args) => { window.openedOrder = args; }; });
  await load(page);
  const discounted = products.find(p => p.name === 'Chaveiro Pai Nosso');
  const custom = products.find(p => p.price === null);
  await add(page, discounted);
  await add(page, custom);
  await openCart(page);
  await page.locator(`#qty-${discounted.id}`).fill('31');
  await page.locator('#cart-title').click();
  await expect(page.locator('#total')).toContainText('186,00 + sob consulta');
  await page.getByRole('textbox', {name: 'Como você imagina a personalização?'}).fill('Azul & dourado + logo #1');
  await page.getByRole('button', {name: /Enviar pedido pelo WhatsApp/}).click();
  const [url, target, features] = await page.evaluate(() => window.openedOrder);
  const order = new URL(url);
  expect(order.origin).toBe('https://wa.me');
  expect(order.pathname).toBe(`/${config.whatsapp}`);
  expect(target).toBe('_blank');
  expect(features).toBe('noopener,noreferrer');
  const message = order.searchParams.get('text');
  expect(message).toContain(`Olá, ${config.name}!`);
  expect(message).toContain(`(${discounted.id})`);
  expect(message).toContain('Quantidade: 31');
  expect(message).toContain('186,00');
  expect(message).toContain('Valor sob consulta');
  expect(message).toContain('Azul & dourado + logo #1');
});

test('restaura sacola descartando produtos desconhecidos', async ({page}) => {
  await page.addInitScript(({key, id}) => localStorage.setItem(key, JSON.stringify([{id: 'unknown', quantity: 5}, {id, quantity: 0}])), {key: storageKey, id: products[0].id});
  await load(page);
  await openCart(page);
  await expect(page.locator('.cart-item')).toHaveCount(1);
  await expect(page.locator(`#qty-${products[0].id}`)).toHaveValue(String(products[0].minimumQuantity));
});

test('sacola funciona quando o armazenamento está bloqueado', async ({page}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('bloqueado'); };
    Storage.prototype.setItem = () => { throw new Error('bloqueado'); };
  });
  await load(page);
  await add(page, products[0]);
  await openCart(page);
  await expect(page.locator('.cart-item')).toHaveCount(1);
});

test('falha no catálogo oferece contato e impede checkout', async ({page}) => {
  await page.route('**/data/products.json', route => route.fulfill({status: 503, body: 'Indisponível'}));
  await page.goto('/');
  await expect(page.locator('#results')).toHaveText('Não foi possível carregar o catálogo.');
  await expect(page.locator('#products a')).toHaveAttribute('href', `https://wa.me/${config.whatsapp}`);
  await page.locator('#open-cart').click();
  await expect(page.locator('#cart-items')).toContainText('Catálogo indisponível');
  await expect(page.locator('#cart-checkout')).toBeHidden();
});

 test('exibe produtos em lotes e reinicia a paginação ao buscar e filtrar', async ({page}) => {
  await page.goto('/');
  await expect(cards(page)).toHaveCount(12);
  await expect(page.locator('#results')).toContainText(`12 de ${products.length}`);
  await page.getByRole('button', {name: 'Exibir mais produtos'}).click();
  await expect(cards(page)).toHaveCount(Math.min(24, products.length));
  await expect(cards(page).locator('h3')).toHaveText(products.slice(0,24).map(p => p.name));
  await page.locator(`[data-detail="${products[12].id}"]`).click();
  await expect(page.locator('#detail-title')).toHaveText(products[12].name);
  await page.keyboard.press('Escape');
  await page.getByRole('searchbox').fill(products.at(-1).id);
  await expect(cards(page)).toHaveCount(1);
  await expect(page.locator('#load-more')).toBeHidden();
  await page.getByRole('searchbox').fill('');
  await expect(cards(page)).toHaveCount(12);
  await showAll(page);
  await expect(page.locator('#load-more')).toBeHidden();
  await page.locator('#categories').getByRole('button', {name: 'Todos', exact: true}).click();
  await expect(cards(page)).toHaveCount(12);
  await page.getByRole('searchbox').fill('produto inexistente xyz');
  await expect(cards(page)).toHaveCount(0);
  await expect(page.locator('#load-more')).toBeHidden();
});

test('cor é opcional e acompanha cada item da sacola até o WhatsApp', async ({page}) => {
  const [product, uncolored] = products;
  await page.route('**/data/products.json', route => route.fulfill({
    json: [{...product, colors: [{name: 'Azul', hex: '#0000ff'}, 'Verde & dourado']}, {...uncolored, colors: []}],
  }));
  await page.addInitScript(() => { window.open = url => { window.openedOrder = url; }; });
  await page.goto('/');
  const card = cards(page).first();
  const picker = card.getByLabel('Cor', {exact: true});
  await expect(cards(page).last().getByLabel('Cor', {exact: true})).toHaveCount(0);
  await expect(picker).toHaveValue('');
  const addFromCard = card.getByRole('button', {name: /Adicionar à sacola/});
  await addFromCard.click();
  await picker.selectOption('Azul');
  await addFromCard.click();
  await card.getByRole('button', {name: /Ver detalhes/}).click();
  const detail = page.locator('#product-detail');
  await detail.getByLabel('Cor', {exact: true}).selectOption('Verde & dourado');
  await detail.getByRole('button', {name: /Adicionar à sacola/}).click();

  await page.reload();
  await expect(cards(page)).toHaveCount(2);
  await openCart(page);
  const rows = page.locator('.cart-item');
  await expect(rows).toHaveCount(3);
  const blue = rows.filter({hasText: 'Cor: Azul'});
  await blue.getByRole('spinbutton').fill(String(product.minimumQuantity + 1));
  await page.locator('#cart-title').click();
  await expect(blue.getByRole('spinbutton')).toHaveValue(String(product.minimumQuantity + 1));
  await expect(rows.last().getByRole('spinbutton')).toHaveValue(String(product.minimumQuantity));

  await page.getByRole('button', {name: /Enviar pedido pelo WhatsApp/}).click();
  const order = new URL(await page.evaluate(() => window.openedOrder));
  expect(order.searchParams.get('text')).toContain('Cor: Azul');
  expect(order.searchParams.get('text')).toContain('Cor: Verde & dourado');
  await blue.getByRole('button', {name: /Remover/}).click();
  await expect(rows).toHaveCount(2);
  await expect(blue).toHaveCount(0);
});

test('usa a miniatura no cartão e recupera a original quando a miniatura falta', async ({page}) => {
  const [first, second] = products;
  const thumbnail = image => image.replace('assets/products/', 'assets/products/thumbs/');
  await page.route('**/' + thumbnail(second.images[0]), route => route.fulfill({status: 404}));
  await page.goto('/');
  const cover = product => page.locator(`[data-detail="${product.id}"] img`);
  await expect(cover(first)).toHaveAttribute('src', thumbnail(first.images[0]));
  await cover(second).scrollIntoViewIfNeeded();
  await expect(cover(second)).toHaveAttribute('src', second.images[0]);
  await cover(first).click();
  await expect(page.locator('#detail-image')).toHaveAttribute('src', first.images[0]);
});
