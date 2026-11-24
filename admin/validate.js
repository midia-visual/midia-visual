import {colorName} from '../src/shared/product.js';

export function validate(value) {
  if (!Array.isArray(value)) throw new Error('O JSON deve conter uma lista de produtos.');
  const ids = new Set();
  for (const [index, p] of value.entries()) {
    const fail = message => { throw new Error(`Produto ${index + 1}: ${message}`); };
    if (!p || typeof p !== 'object' || Array.isArray(p)) fail('registro inválido.');
    for (const name of ['id', 'name', 'category', 'unit']) {
      if (typeof p[name] !== 'string' || !p[name].trim()) fail(`campo ${name} obrigatório.`);
    }
    if (ids.has(p.id.trim())) fail('código duplicado.');
    ids.add(p.id.trim());
    if (p.price !== null && (typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0)) fail('preço inválido.');
    if (!Number.isSafeInteger(p.minimumQuantity) || p.minimumQuantity < 1) fail('quantidade mínima inválida.');
    if (typeof p.minimumSpecified !== 'boolean' || typeof p.description !== 'string') fail('descrição ou indicador de mínimo inválido.');
    if (!Array.isArray(p.images) || p.images.some(image => typeof image !== 'string' || !image.trim())) fail('imagens devem ser uma lista de caminhos ou URLs.');
    if (p.colors !== undefined && (!Array.isArray(p.colors) || p.colors.some(color => {
      const name = colorName(color);
      return typeof name !== 'string' || !name.trim() || /[\r\n]/.test(name) ||
        (typeof color !== 'string' && (typeof color.hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(color.hex)));
    }))) fail('cores devem conter um nome e um código hexadecimal de cor sólida.');
    if (p.priceTiers !== undefined && (!Array.isArray(p.priceTiers) || p.priceTiers.some(tier => !tier || !Number.isSafeInteger(tier.minimumQuantity) || tier.minimumQuantity < 1 || typeof tier.price !== 'number' || !Number.isFinite(tier.price) || tier.price < 0))) fail('faixas devem conter minimumQuantity inteiro positivo e price não negativo.');
  }
  return value;
}
