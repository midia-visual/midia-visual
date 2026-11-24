import {colorName} from '../src/shared/product.js';
import {$, field} from './form.js';

let colors = [];

export function setColors(values) {
  colors = [...values];
  renderColors();
}

export function readColors() {
  saveColor();
  return [...colors];
}

function renderColors() {
  $('product-colors').replaceChildren(...colors.map((color, index) => {
    const name = colorName(color);
    const row = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = 'color-swatch';
    if (color.hex) {
      swatch.style.backgroundColor = color.hex;
      swatch.setAttribute('aria-hidden', 'true');
    } else {
      swatch.textContent = '?';
      swatch.setAttribute('aria-label', 'Sem amostra cadastrada');
    }
    const label = document.createElement('span');
    label.textContent = name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remover';
    remove.setAttribute('aria-label', `Remover cor ${name}`);
    remove.addEventListener('click', () => {
      colors.splice(index, 1);
      renderColors();
      field('colorName').focus();
    });
    row.append(swatch, label, remove);
    return row;
  }));
}

function saveColor() {
  const name = field('colorName').value.trim();
  if (!name) return false;
  const color = {name, hex: field('colorHex').value};
  const index = colors.findIndex(existing => colorName(existing) === name);
  if (index === -1) colors.push(color);
  else colors[index] = color;
  field('colorName').value = '';
  renderColors();
  return true;
}

const namedColors = [
  ['Preto', 0x000000], ['Branco', 0xffffff], ['Cinza', 0x808080], ['Cinza-claro', 0xc0c0c0],
  ['Vermelho', 0xff0000], ['Vinho', 0x800020], ['Laranja', 0xff8000], ['Amarelo', 0xffff00],
  ['Dourado', 0xffd700], ['Verde', 0x008000], ['Verde-limão', 0x00ff00], ['Oliva', 0x808000],
  ['Azul', 0x0000ff], ['Azul-marinho', 0x000080], ['Azul-claro', 0x87ceeb], ['Turquesa', 0x40e0d0],
  ['Roxo', 0x800080], ['Lilás', 0xc8a2c8], ['Magenta', 0xff00ff], ['Rosa', 0xffc0cb],
  ['Marrom', 0x8b4513], ['Bege', 0xf5f5dc],
];

field('colorHex').addEventListener('input', event => {
  const selected = Number.parseInt(event.target.value.slice(1), 16);
  let name = '';
  let closestDistance = Infinity;
  for (const [candidate, rgb] of namedColors) {
    const red = (selected >> 16) - (rgb >> 16);
    const green = ((selected >> 8) & 255) - ((rgb >> 8) & 255);
    const blue = (selected & 255) - (rgb & 255);
    const distance = red ** 2 + green ** 2 + blue ** 2;
    if (distance < closestDistance) {
      name = candidate;
      closestDistance = distance;
    }
  }
  const hex = event.target.value;
  const nameInUse = colors.some(color => colorName(color) === name && color.hex && color.hex.toLowerCase() !== hex);
  field('colorName').value = nameInUse ? `${name} (${hex})` : name;
});

$('add-color').addEventListener('click', () => {
  $('form-error').textContent = saveColor() ? '' : 'Informe o nome da cor.';
  field('colorName').focus();
});
field('colorName').addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  $('add-color').click();
});

