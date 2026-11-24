import {money} from '../src/shared/product.js';
import {$} from './form.js';

export function addTier(tier) {
  const row = document.createElement('div');
  row.className = 'tier-row';
  row.innerHTML = '<label>Quantidade superior a<input class="tier-threshold" type="number" min="0" step="1" required></label><label>Preço por unidade (R$)<input class="tier-price" type="number" min="0" step="0.01" required></label><button type="button" class="danger">Remover faixa</button><p class="tier-summary"></p>';
  const threshold = row.querySelector('.tier-threshold');
  const price = row.querySelector('.tier-price');
  threshold.value = tier ? tier.minimumQuantity - 1 : '';
  price.value = tier?.price ?? '';
  const summarize = () => {
    row.querySelector('.tier-summary').textContent = threshold.value !== '' && price.value !== ''
      ? `A partir de ${Number(threshold.value) + 1} unidades: ${money(Number(price.value))} por unidade.` : '';
  };
  row.addEventListener('input', summarize);
  row.querySelector('button').addEventListener('click', () => row.remove());
  summarize();
  $('price-tiers').append(row);
  return threshold;
}
$('add-tier').addEventListener('click', () => addTier().focus());
export function readTiers() {
  const tiers = [...$('price-tiers').children].map(row => ({
    minimumQuantity: Number(row.querySelector('.tier-threshold').value) + 1,
    price: Number(row.querySelector('.tier-price').value),
  })).sort((a, b) => a.minimumQuantity - b.minimumQuantity);
  if (new Set(tiers.map(tier => tier.minimumQuantity)).size !== tiers.length) {
    throw new Error('Cada faixa de preço deve ter uma quantidade diferente.');
  }
  return tiers;
}
