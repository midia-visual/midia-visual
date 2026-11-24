import test from 'node:test';
import assert from 'node:assert/strict';
import {unitPrice, validQuantity, restoreCart, money, buildMessage} from '../src/shared/cart.js';

const product = {id: 'A', name: 'Caneta', price: 1.1, minimumQuantity: 10, unit: 'unidade'};
const custom = {id: 'B', name: 'Brinde personalizado', price: null, minimumQuantity: 1, unit: 'kit'};

test('preço base, sob consulta e limites das faixas de desconto', () => {
  assert.equal(unitPrice(product, 100), 1.1);
  assert.equal(unitPrice(custom, 1), null);
  const tiered = {...product, priceTiers: [{minimumQuantity: 20, price: 1}, {minimumQuantity: 50, price: 0.8}]};
  for (const [quantity, expected] of [[19, 1.1], [20, 1], [49, 1], [50, 0.8], [100, 0.8]]) {
    assert.equal(unitPrice(tiered, quantity), expected);
  }
});

test('quantidades normalizam texto, decimais, valores inválidos e teto', () => {
  for (const value of [undefined, null, '', 'abc', NaN, Infinity, -Infinity, -1, 0, 9]) {
    assert.equal(validQuantity(value, product), 10, String(value));
  }
  assert.equal(validQuantity('21.9', product), 21);
  assert.equal(validQuantity(99999, product), 99999);
  assert.equal(validQuantity(100000, product), 99999);
});

test('restauração rejeita estruturas inválidas e produtos desconhecidos', () => {
  for (const raw of [null, '', '{', '{}', 'null', '42', '"texto"']) {
    assert.deepEqual(restoreCart(raw, [product]), []);
  }
  assert.deepEqual(restoreCart(JSON.stringify([{id: 'unknown', quantity: 10}, {id: 'A', quantity: 2}]), [product]), [{id: 'A', quantity: 10}]);
});

test('restauração consolida duplicatas e limita quantidades', () => {
  const raw = JSON.stringify([{id: 'A', quantity: 20}, {id: 'B', quantity: 999999}, {id: 'A', quantity: 30}]);
  assert.deepEqual(restoreCart(raw, [product, custom]), [{id: 'A', quantity: 30}, {id: 'B', quantity: 99999}]);
});

test('formatação usa reais e duas casas decimais', () => {
  assert.equal(money(1234.5).replace(/\s/g, ' '), 'R$ 1.234,50');
  assert.equal(money(0).replace(/\s/g, ' '), 'R$ 0,00');
});

test('mensagem soma centavos, inclui códigos e remove espaços das observações', () => {
  const message = buildMessage([{id: 'A', quantity: 10}], [product], '  Azul & <dourado>  ', 'Minha loja');
  assert.ok(message.includes('Olá, Minha loja!'));
  assert.ok(message.includes('Caneta (A)'));
  assert.ok(message.includes('Quantidade: 10'));
  assert.ok(message.includes(`Total dos produtos: ${money(11)}`));
  assert.ok(message.includes('Cores e personalização: Azul & <dourado>\n'));
  assert.ok(!message.includes('sob consulta'));
});

test('mensagem separa itens sob consulta e omite observações vazias', () => {
  const message = buildMessage([{id: 'A', quantity: 10}, {id: 'B', quantity: 2}], [product, custom], '  \n ', 'Loja');
  assert.ok(message.includes(`Subtotal dos itens com preço: ${money(11)}`));
  assert.ok(message.includes('Valor sob consulta'));
  assert.ok(message.includes('Há itens com valor sob consulta.'));
  assert.ok(!message.includes('Cores e personalização:'));
});
