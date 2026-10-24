import test from 'node:test';
import assert from 'node:assert/strict';

async function cliente() {
  try { sessionStorage.clear(); } catch { /* Node puede ejecutarse sin almacenamiento web. */ }
  return import('../js/api.js?prueba=' + Math.random());
}
const muestra = { id: 25, name: 'pikachu', height: 4, weight: 60, sprites: { front_default: 'https://ejemplo.test/pikachu.png' }, types: [{ type: { name: 'electric' } }], abilities: [{ ability: { name: 'static' } }], stats: [{ stat: { name: 'speed' }, base_stat: 90 }] };

test('el cliente reutiliza consultas simultáneas y respuestas guardadas', async t => {
  let llamadas = 0;
  t.mock.method(globalThis, 'fetch', async () => { llamadas++; return { ok: true, json: async () => muestra }; });
  const api = await cliente();
  const [a, b] = await Promise.all([api.obtenerPokemon(25), api.obtenerPokemon(25)]);
  assert.deepEqual(a, b);
  assert.equal(a.altura, .4);
  assert.equal(a.peso, 6);
  assert.equal(a.estadisticas[0].valor, 90);
  await api.obtenerPokemon(25);
  assert.equal(llamadas, 1);
});
test('los errores HTTP conservan su estado y permiten reintentar', async t => {
  let llamadas = 0;
  t.mock.method(globalThis, 'fetch', async () => ++llamadas === 1 ? { ok: false, status: 503 } : { ok: true, json: async () => muestra });
  const api = await cliente();
  await assert.rejects(api.obtenerPokemon(25), e => e.estado === 503);
  assert.equal((await api.obtenerPokemon(25)).nombre, 'pikachu');
});
test('el cliente distingue un recurso inexistente y una conexión fallida', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 404 }));
  const api = await cliente();
  await assert.rejects(api.obtenerPokemon(25), /No se encontró/);
  globalThis.fetch.mock.mockImplementation(async () => { throw new TypeError('Network error'); });
  await assert.rejects(api.obtenerPokemon(25), /conectar/);
});
test('el tiempo agotado produce un mensaje de reintento', async t => {
  t.mock.method(globalThis, 'fetch', async () => { const error = new Error(); error.name = 'AbortError'; throw error; });
  const api = await cliente();
  await assert.rejects(api.obtenerPokemon(25), /tardó demasiado/);
});
test('la validación rechaza consultas fuera del catálogo sin usar la red', async t => {
  const consulta = t.mock.method(globalThis, 'fetch', async () => { throw new Error('No debe llamarse'); });
  const api = await cliente();
  await assert.rejects(api.obtenerPokemon(152), /entre 1 y 151/);
  await assert.rejects(api.obtenerPokemon('../'), /entre 1 y 151/);
  await assert.rejects(api.obtenerTipo('../'), /Tipo no válido/);
  assert.equal(consulta.mock.callCount(), 0);
});
test('el filtro por tipo excluye Pokémon posteriores a Kanto', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ pokemon: [{ pokemon: { url: 'https://pokeapi.co/api/v2/pokemon/25/' } }, { pokemon: { url: 'https://pokeapi.co/api/v2/pokemon/200/' } }] }) }));
  const api = await cliente();
  assert.deepEqual(await api.obtenerTipo('electric'), [25]);
});
