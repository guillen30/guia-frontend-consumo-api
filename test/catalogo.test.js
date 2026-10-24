import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrarCatalogo, paginar } from '../js/catalogo.js';

const catalogo = [{ id: 1, nombre: 'bulbasaur' }, { id: 4, nombre: 'charmander' }, { id: 25, nombre: 'pikachu' }, { id: 151, nombre: 'mew' }];

test('la búsqueda admite nombres parciales, espacios y mayúsculas', () => {
  assert.deepEqual(filtrarCatalogo(catalogo, { busqueda: '  PIKA  ' }).map(p => p.id), [25]);
});
test('el número admite almohadilla y ceros iniciales sin coincidir parcialmente', () => {
  assert.deepEqual(filtrarCatalogo(catalogo, { busqueda: '#025' }).map(p => p.id), [25]);
  assert.deepEqual(filtrarCatalogo(catalogo, { busqueda: '15' }), []);
});
test('la búsqueda, los tipos y los favoritos se combinan por intersección', () => {
  assert.deepEqual(filtrarCatalogo(catalogo, { idsTipo: new Set([1, 4]), favoritos: new Set([4, 25]), busqueda: 'char' }).map(p => p.id), [4]);
  assert.deepEqual(filtrarCatalogo(catalogo, { favoritos: new Set() }), []);
});
test('ordenar no modifica el catálogo original', () => {
  assert.deepEqual(filtrarCatalogo(catalogo, { orden: 'nombre' }).map(p => p.id), [1, 4, 151, 25]);
  assert.deepEqual(catalogo.map(p => p.id), [1, 4, 25, 151]);
});
test('la paginación limita el índice y conserva la última página incompleta', () => {
  const elementos = Array.from({ length: 151 }, (_, i) => i + 1);
  assert.deepEqual(paginar(elementos, 99), { elementos: [145, 146, 147, 148, 149, 150, 151], pagina: 13, paginas: 13, total: 151 });
  assert.equal(paginar(elementos, -2).pagina, 1);
  assert.deepEqual(paginar([], 5), { elementos: [], pagina: 1, paginas: 1, total: 0 });
});
