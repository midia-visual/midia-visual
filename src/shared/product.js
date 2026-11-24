export const colorName = color => typeof color === 'string' ? color : color?.name;

const currency = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
export const money = value => currency.format(value);
export const normalize = text => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');

export function indexProducts(products) {
  return new Map(products.map(product => [product.id, product]));
}
