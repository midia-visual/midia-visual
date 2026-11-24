import {indexProducts, money} from './product.js';
export {money} from './product.js';

export function unitPrice(product, quantity) {
  return (product.priceTiers || []).reduce((price, tier) => quantity >= tier.minimumQuantity ? tier.price : price, product.price);
}
export function validQuantity(value, product) {
  const number = Number(value);
  return Math.min(99999, Math.max(product.minimumQuantity, Number.isFinite(number) ? Math.floor(number) : product.minimumQuantity));
}
export function restoreCart(raw, products) {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const byId = products instanceof Map ? products : indexProducts(products);
    const result = new Map();
    for (const item of data) {
      const product = byId.get(item?.id);
      if (!product) continue;
      const entry = {id: product.id, quantity: validQuantity(item.quantity, product)};
      if (typeof item.color === 'string' && item.color.trim()) entry.color = item.color;
      result.set(JSON.stringify([entry.id, entry.color]), entry);
    }
    return [...result.values()];
  } catch { return []; }
}
export function summarizeCart(cart, productsById) {
  let totalCents = 0;
  let unknown = false;
  let quantity = 0;
  const lines = cart.map(item => {
    const product = productsById.get(item.id);
    const price = unitPrice(product, item.quantity);
    quantity += item.quantity;
    if (price === null) unknown = true;
    else totalCents += Math.round(price * 100) * item.quantity;
    return {item, product, price};
  });
  return {lines, quantity, total: totalCents / 100, unknown};
}

export function buildMessage(cart, products, notes, storeName) {
  const byId = products instanceof Map ? products : indexProducts(products);
  const {lines, total, unknown} = summarizeCart(cart, byId);
  const order = lines.map(({item, product: p, price}) => {
    return `• ${p.name} (${p.id})${item.color ? '\n  Cor: ' + item.color : ''}\n  Quantidade: ${item.quantity} | ${price === null ? 'Valor sob consulta' : money(price) + '/' + p.unit + ' | Subtotal: ' + money(price * item.quantity)}`;
  });
  return [`Olá, ${storeName}! Gostaria de solicitar um orçamento:`, '', ...order, '', `${unknown ? 'Subtotal dos itens com preço' : 'Total dos produtos'}: ${money(total)}`, ...(unknown ? ['Há itens com valor sob consulta.'] : []), ...(notes.trim() ? ['', 'Cores e personalização: ' + notes.trim()] : []), '', 'Por favor, confirmem a disponibilidade, personalização, prazo e frete.'].join('\n');
}
