import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {unitPrice,validQuantity,restoreCart,buildMessage} from '../src/shared/cart.js';
const products=JSON.parse(readFileSync(new URL('../data/products.json',import.meta.url)));
test('catálogo possui identificadores únicos, preços válidos e fotos locais',()=>{
 assert.equal(new Set(products.map(p=>p.id)).size,products.length);
 for(const p of products){assert.ok(p.price===null||p.price>0);assert.ok(p.minimumQuantity>=1);assert.ok(!('sourcePage' in p));assert.ok(!('image' in p));assert.ok(Array.isArray(p.images)&&p.images.length>0);for(const image of p.images){assert.ok(!image.startsWith('/'));assert.ok(existsSync(new URL('../'+image,import.meta.url)));}}
});
test('quantidades respeitam mínimo e restauram apenas produtos válidos',()=>{
 const p=products[0];assert.equal(validQuantity(-3,p),100);assert.equal(validQuantity('abc',p),100);assert.equal(validQuantity(110.9,p),110);
 assert.deepEqual(restoreCart('[{"id":"MV001","quantity":2},{"id":"unknown","quantity":5}]',products),[{id:'MV001',quantity:100}]);assert.deepEqual(restoreCart('{broken',products),[]);
});
test('desconto Pai Nosso aplica somente acima de 30 unidades',()=>{const p=products.find(p=>p.name==='Chaveiro Pai Nosso');assert.equal(unitPrice(p,30),9);assert.equal(unitPrice(p,31),6);});
test('mensagem inclui quantidades, desconto, itens sob consulta e observações',()=>{
 const p=products.find(p=>p.name==='Chaveiro Pai Nosso'),q=products.find(p=>p.price===null);
 const message=buildMessage([{id:p.id,quantity:31},{id:q.id,quantity:1}],products,'Azul & dourado','Loja de teste');
 assert.match(message,/Olá, Loja de teste!/);assert.match(message,/Quantidade: 31/);assert.match(message,/186,00/);assert.match(message,/sob consulta/);assert.match(message,/Azul & dourado/);assert.equal(decodeURIComponent(encodeURIComponent(message)),message);
});
