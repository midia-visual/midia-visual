import {money, normalize} from '../src/shared/product.js';
import {validate} from './validate.js';
import {$, form, field} from './form.js';
import {setColors, readColors} from './colors.js';
import {addTier, readTiers} from './price-tiers.js';

const categories = ['Chaveiros', 'Térmicos', 'Churrasco', 'Canetas', 'Chimarrão', 'Presentes', 'Comunicação visual', 'Troféus/medalhas', 'Acessórios', 'Escritório', 'Acrílico e MDF', 'Churrasco e cozinha', 'Vinho e bar', 'Copos e térmicos', 'Bolsas e nécessaires', 'Datas comemorativas'];
const key = 'midia-visual-admin-draft-v1';
let products = [];
let editing = null;
let removing = null;
let editorVersion = 0;
let readingImages = false;
function renderTable() {
  const query = normalize($('search').value);
  const visible = products.filter(p => normalize(p.name).includes(query));
  $('products').replaceChildren(...visible.map(p => {
    const row = document.createElement('tr');
    const name = row.insertCell();
    const code = document.createElement('small'); code.textContent = p.id;
    name.append(code, document.createTextNode(p.name));
    for (const value of [p.category, p.price === null ? 'Sob consulta' : money(p.price), `${p.minimumQuantity} ${p.unit}`]) row.insertCell().textContent = value;
    const actions = document.createElement('div'); actions.className = 'actions';
    for (const [label, action] of [['Editar', () => openEditor(p)], ['Remover', () => {
      removing = p.id; $('removal-name').textContent = p.name; $('removal').showModal();
    }]]) {
      const button = document.createElement('button'); button.textContent = label; button.addEventListener('click', action); actions.append(button);
    }
    row.insertCell().append(actions); return row;
  }));
  $('count').textContent = `${visible.length} de ${products.length} produtos`;
  $('empty').hidden = visible.length > 0;
}
function renderCatalog() {
  renderTable();
  $('json').textContent = JSON.stringify(products, null, 2);
}
function changed(message) {
  renderCatalog();
  try { localStorage.setItem(key, JSON.stringify(products)); $('status').textContent = message + ' Rascunho salvo neste navegador.'; }
  catch { $('status').textContent = message + ' Não foi possível salvar o rascunho no navegador. Baixe o JSON antes de sair.'; }
}
function imageValues() {
  return field('images').value.split('\n').map(value => value.trim()).filter(Boolean);
}
function renderImages() {
  $('image-preview').replaceChildren(...imageValues().map((source, index) => {
    const item = document.createElement('div');
    const image = document.createElement('img');
    image.alt = `Imagem ${index + 1}`;
    image.src = source.startsWith('assets/') ? '../' + source : source;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = 'Remover';
    remove.setAttribute('aria-label', `Remover imagem ${index + 1}`);
    remove.addEventListener('click', () => {
      field('images').value = imageValues().filter((_, i) => i !== index).join('\n');
      renderImages();
    });
    item.append(image, remove); return item;
  }));
}
$('add-images').addEventListener('click', () => $('image-files').click());
$('image-files').addEventListener('change', async event => {
  const files = [...event.target.files];
  if (!files.length) return;
  const version = editorVersion;
  readingImages = true;
  $('save-product').disabled = true;
  $('image-files').disabled = true;
  $('add-images').disabled = true;
  $('image-status').textContent = 'Carregando imagens…';
  try {
    const images = await Promise.all(files.map(file => new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) return reject(new Error(`${file.name}: selecione um arquivo de imagem.`));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Não foi possível ler ${file.name}.`));
      reader.onabort = () => reject(new Error(`Leitura cancelada: ${file.name}.`));
      reader.readAsDataURL(file);
    })));
    if (version !== editorVersion) return;
    field('images').value = [...imageValues(), ...images].join('\n');
    renderImages();
    $('image-status').textContent = `${images.length} imagem(ns) adicionada(s). Salve o produto para aplicar.`;
  } catch (error) {
    if (version === editorVersion) $('image-status').textContent = error.message;
  } finally {
    if (version === editorVersion) {
      readingImages = false;
      $('save-product').disabled = false;
      $('image-files').disabled = false;
      $('add-images').disabled = false;
      $('image-files').value = '';
    }
  }
});
$('editor').addEventListener('close', () => { editorVersion++; });
function openEditor(product) {
  editorVersion++;
  readingImages = false;
  $('save-product').disabled = false;
  $('image-files').disabled = false;
  $('add-images').disabled = false;
  $('image-status').textContent = '';
  editing = product?.id ?? null;
  form.reset(); $('form-error').textContent = '';
  $('editor-title').textContent = product ? 'Editar produto' : 'Novo produto';
  field('category').replaceChildren(...categories.map(category => new Option(category, category)));
  if (product && !categories.includes(product.category)) {
    field('category').add(new Option(`${product.category} (categoria atual)`, product.category));
  }
  for (const name of ['id', 'name', 'category', 'price', 'minimumQuantity', 'unit', 'description']) field(name).value = product?.[name] ?? ({minimumQuantity: 1, unit: 'unidade', category: categories[0]}[name] ?? '');
  field('minimumSpecified').checked = product?.minimumSpecified ?? true;
  setColors(product?.colors ?? []);
  field('images').value = product?.images.join('\n') ?? '';
  $('price-tiers').replaceChildren();
  for (const tier of product?.priceTiers ?? []) addTier(tier);
  renderImages();
  $('editor').showModal();
}
form.addEventListener('submit', event => {
  event.preventDefault();
  if (readingImages) return;
  try {
    const product = {...(products.find(p => p.id === editing) ?? {})};
    for (const name of ['id', 'name', 'category', 'unit', 'description']) product[name] = field(name).value.trim();
    if (products.some(p => p.id !== editing && p.id === product.id)) throw new Error('Já existe um produto com este código.');
    product.price = field('price').value === '' ? null : Number(field('price').value);
    product.minimumQuantity = Number(field('minimumQuantity').value);
    product.minimumSpecified = field('minimumSpecified').checked;
    product.images = imageValues();
    const colors = readColors();
    if (colors.length) product.colors = colors;
    else delete product.colors;
    const tiers = readTiers();
    if (tiers.length) product.priceTiers = tiers;
    else delete product.priceTiers;
    validate([product]);
    if (editing === null) products.push(product);
    else products[products.findIndex(p => p.id === editing)] = product;
    changed('Produto salvo.'); $('editor').close();
  } catch (error) { $('form-error').textContent = error.message; }
});
for (const id of ['close', 'cancel']) $(id).addEventListener('click', () => $('editor').close());
$('keep').addEventListener('click', () => $('removal').close());
$('confirm-remove').addEventListener('click', () => { products = products.filter(p => p.id !== removing); changed('Produto removido.'); $('removal').close(); });
$('create').addEventListener('click', () => openEditor());
$('search').addEventListener('input', renderTable);
$('import').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    const imported = validate(JSON.parse((await file.text()).replace(/^\uFEFF/, '')));
    if (confirm(`Importar ${imported.length} produtos e substituir o rascunho atual?`)) {
      products = imported; $('search').value = ''; changed('JSON importado.');
      for (const id of ['create', 'download', 'search']) $(id).disabled = false;
    }
  } catch (error) { $('status').textContent = `Importação não realizada: ${error.message}`; }
  finally { event.target.value = ''; }
});
$('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([$('json').textContent + '\n'], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = 'products.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
async function init() {
  try {
    const response = await fetch('../data/products.json', {cache: 'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    products = validate(await response.json());
    $('status').textContent = 'Catálogo carregado de products.json.';
    try {
      const draft = localStorage.getItem(key);
      if (draft && confirm('Há um rascunho local salvo. Deseja continuar suas edições? Cancele para carregar o products.json atual.')) {
        products = validate(JSON.parse(draft)); $('status').textContent = 'Rascunho local restaurado.';
      }
    } catch { $('status').textContent = 'Catálogo carregado. O rascunho local não pôde ser restaurado.'; }
    renderCatalog();
    for (const id of ['create', 'import', 'download', 'search']) $(id).disabled = false;
  } catch (error) { $('status').textContent = `Não foi possível carregar o catálogo: ${error.message}. Você pode importar um JSON.`; $('import').disabled = false; }
}
init();
