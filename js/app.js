import { obtenerCatalogo, obtenerPokemon, obtenerTipo } from './api.js';
import { filtrarCatalogo, paginar } from './catalogo.js';

const $ = selector => document.querySelector(selector);
const tipos = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta', ice: 'Hielo',
  fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho',
  rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', steel: 'Acero', fairy: 'Hada'
};
const nombresStats = { hp: 'PS', attack: 'Ataque', defense: 'Defensa', 'special-attack': 'At. especial', 'special-defense': 'Def. especial', speed: 'Velocidad' };
const escape = valor => String(valor).replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter]));
const nombre = valor => valor.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
const numero = id => '#' + String(id).padStart(3, '0');
const insignias = pokemon => pokemon.tipos.map(tipo => `<span class="tipo ${escape(tipo)}">${escape(tipos[tipo] || nombre(tipo))}</span>`).join('');
const estado = { catalogo: [], pagina: 1, favoritos: false, turno: 0, ficha: 0 };
let favoritos = new Set();
try {
  const guardados = JSON.parse(localStorage.getItem('pokedex:favoritos') || '[]');
  if (Array.isArray(guardados)) favoritos = new Set(guardados.filter(id => Number.isInteger(id) && id >= 1 && id <= 151));
} catch { /* Los favoritos de esta sesión siguen disponibles sin almacenamiento. */ }

function actualizarCuenta() { $('#cuenta-favoritos').textContent = favoritos.size; }
function alternarFavorito(id) {
  if (favoritos.has(id)) favoritos.delete(id); else favoritos.add(id);
  try { localStorage.setItem('pokedex:favoritos', JSON.stringify([...favoritos])); } catch {
    $('#estado').textContent = 'Favoritos actualizados para esta sesión. El navegador no permitió guardarlos.';
  }
  actualizarCuenta();
  document.querySelectorAll(`[data-favorito="${id}"]`).forEach(boton => {
    boton.setAttribute('aria-pressed', favoritos.has(id));
    boton.setAttribute('aria-label', `${favoritos.has(id) ? 'Quitar de' : 'Añadir a'} favoritos a ${boton.dataset.nombre}`);
    boton.textContent = favoritos.has(id) ? '♥' : '♡';
  });
  if (estado.favoritos) mostrarCatalogo();
}

function tarjeta(pokemon) {
  const favorito = favoritos.has(pokemon.id);
  return `<article class="tarjeta ${escape(pokemon.tipos[0])}">
    <div class="tarjeta-arriba"><span>${numero(pokemon.id)}</span><button class="favorito" type="button" data-favorito="${pokemon.id}" data-nombre="${escape(nombre(pokemon.nombre))}" aria-pressed="${favorito}" aria-label="${favorito ? 'Quitar de' : 'Añadir a'} favoritos a ${escape(nombre(pokemon.nombre))}">${favorito ? '♥' : '♡'}</button></div>
    <button class="abrir-pokemon" type="button" data-pokemon="${pokemon.id}" aria-label="Ver ficha de ${escape(nombre(pokemon.nombre))}"><div class="imagen-tarjeta">${pokemon.imagen ? `<img src="${escape(pokemon.imagen)}" alt="${escape(nombre(pokemon.nombre))}" width="160" height="160" loading="lazy">` : '<span class="sin-imagen">Sin imagen</span>'}</div><h3>${escape(nombre(pokemon.nombre))}</h3><div class="tipos">${insignias(pokemon)}</div><span class="ver-ficha">Ver ficha <span aria-hidden="true">↗</span></span></button>
  </article>`;
}

function mensaje(titulo, texto, reintentar = false) {
  $('#mensaje').hidden = false;
  $('#mensaje-titulo').textContent = titulo;
  $('#mensaje-texto').textContent = texto;
  $('#reintentar').hidden = !reintentar;
}

function esqueletos() {
  $('#resultados').innerHTML = Array.from({ length: 12 }, () => '<div class="esqueleto" aria-hidden="true"><div></div><span></span><span></span></div>').join('');
}

async function mostrarCatalogo() {
  const turno = ++estado.turno;
  const consulta = $('#busqueda').value;
  const tipo = $('#tipo').value;
  $('#mensaje').hidden = true;
  $('#estado').textContent = 'Buscando Pokémon…';
  $('#resultados').setAttribute('aria-busy', 'true');
  $('#anterior').disabled = $('#siguiente').disabled = true;
  $('#limpiar').hidden = !consulta && !tipo && !estado.favoritos && $('#orden').value === 'numero';
  esqueletos();
  try {
    const idsTipo = tipo ? new Set(await obtenerTipo(tipo)) : null;
    if (turno !== estado.turno) return;
    const filtrados = filtrarCatalogo(estado.catalogo, { busqueda: consulta, idsTipo, favoritos: estado.favoritos ? favoritos : null, orden: $('#orden').value });
    const pagina = paginar(filtrados, estado.pagina);
    estado.pagina = pagina.pagina;
    const respuestas = await Promise.allSettled(pagina.elementos.map(item => obtenerPokemon(item.id)));
    if (turno !== estado.turno) return;
    const correctos = respuestas.filter(r => r.status === 'fulfilled').map(r => r.value);
    $('#resultados').innerHTML = correctos.map(tarjeta).join('');
    const errores = respuestas.length - correctos.length;
    $('#estado').textContent = pagina.total ? `${estado.favoritos ? 'Tus favoritos · ' : ''}${pagina.total} Pokémon${tipo ? ' de tipo ' + tipos[tipo].toLowerCase() : ''} · Mostrando ${correctos.length} en esta página` : 'Sin resultados';
    $('#pagina').textContent = `Página ${pagina.pagina} de ${pagina.paginas}`;
    $('#anterior').disabled = pagina.pagina <= 1;
    $('#siguiente').disabled = pagina.pagina >= pagina.paginas;
    if (errores) mensaje('No pudimos cargar todas las fichas', 'Algunas consultas fallaron. Puedes intentar cargar esta página otra vez.', true);
    if (!pagina.total) mensaje(estado.favoritos && !favoritos.size ? 'Tu colección empieza aquí' : 'No encontramos coincidencias', estado.favoritos && !favoritos.size ? 'Pulsa el corazón de cualquier Pokémon para guardarlo en tus favoritos.' : 'Prueba con otro nombre, un número del 1 al 151 o un tipo diferente.');
    document.querySelectorAll('#resultados img').forEach(imagen => imagen.addEventListener('error', () => {
      imagen.replaceWith(Object.assign(document.createElement('span'), { className: 'sin-imagen', textContent: 'Imagen no disponible' }));
    }, { once: true }));
  } catch (error) {
    if (turno !== estado.turno) return;
    $('#resultados').innerHTML = '';
    $('#estado').textContent = 'No se pudo completar la consulta';
    mensaje('La aventura tendrá que esperar un momento', error.message, true);
  } finally {
    if (turno === estado.turno) $('#resultados').setAttribute('aria-busy', 'false');
  }
}

async function abrirFicha(id) {
  const dialogo = $('#ficha');
  const turno = ++estado.ficha;
  $('#contenido-ficha').innerHTML = '<h2 id="nombre-ficha">Cargando ficha…</h2><p role="status">Consultando los datos del Pokémon.</p>';
  if (!dialogo.open) dialogo.showModal();
  try {
    const pokemon = await obtenerPokemon(id);
    if (turno !== estado.ficha || !dialogo.open) return;
    $('#contenido-ficha').innerHTML = `<div class="portada-ficha ${escape(pokemon.tipos[0])}"><span class="numero-ficha">${numero(pokemon.id)} · KANTO</span>${pokemon.imagen ? `<img src="${escape(pokemon.imagen)}" alt="${escape(nombre(pokemon.nombre))}" width="230" height="230">` : '<p>Imagen no disponible</p>'}</div><div class="cuerpo-ficha"><div class="nombre-fila"><h2 id="nombre-ficha">${escape(nombre(pokemon.nombre))}</h2><button class="favorito" data-favorito="${pokemon.id}" data-nombre="${escape(nombre(pokemon.nombre))}" aria-pressed="${favoritos.has(pokemon.id)}" aria-label="${favoritos.has(pokemon.id) ? 'Quitar de' : 'Añadir a'} favoritos a ${escape(nombre(pokemon.nombre))}">${favoritos.has(pokemon.id) ? '♥' : '♡'}</button></div><div class="tipos">${insignias(pokemon)}</div><dl class="medidas"><div><dt>Altura</dt><dd>${pokemon.altura.toLocaleString('es')} m</dd></div><div><dt>Peso</dt><dd>${pokemon.peso.toLocaleString('es')} kg</dd></div></dl><h3>Habilidades</h3><p class="habilidades">${pokemon.habilidades.map(h => escape(nombre(h))).join(' · ')}</p><h3>Estadísticas base</h3><div class="estadisticas">${pokemon.estadisticas.map(s => `<div class="estadistica"><span>${escape(nombresStats[s.nombre] || s.nombre)}</span><meter min="0" max="255" value="${Number(s.valor)}" aria-label="${escape(nombresStats[s.nombre] || s.nombre)}">${Number(s.valor)}</meter><strong>${Number(s.valor)}</strong></div>`).join('')}</div></div>`;
    $('#contenido-ficha img')?.addEventListener('error', evento => { evento.target.hidden = true; }, { once: true });
  } catch (error) {
    if (turno !== estado.ficha || !dialogo.open) return;
    $('#contenido-ficha').innerHTML = `<div class="error-ficha"><h2 id="nombre-ficha">No se pudo abrir la ficha</h2><p>${escape(error.message)}</p><button class="boton principal" data-pokemon="${id}" type="button">Reintentar</button></div>`;
  }
}

async function iniciar() {
  $('#mensaje').hidden = true;
  $('#estado').textContent = 'Cargando catálogo…';
  esqueletos();
  try {
    estado.catalogo = await obtenerCatalogo();
    await mostrarCatalogo();
  } catch (error) {
    $('#resultados').innerHTML = '';
    $('#resultados').setAttribute('aria-busy', 'false');
    $('#estado').textContent = 'Catálogo no disponible';
    mensaje('No pudimos abrir el catálogo', error.message, true);
  }
}

Object.entries(tipos).sort((a, b) => a[1].localeCompare(b[1])).forEach(([valor, texto]) => $('#tipo').add(new Option(texto, valor)));
$('#filtros').addEventListener('submit', evento => { evento.preventDefault(); clearTimeout(temporizador); estado.pagina = 1; mostrarCatalogo(); });
let temporizador;
$('#busqueda').addEventListener('input', () => { clearTimeout(temporizador); temporizador = setTimeout(() => { estado.pagina = 1; mostrarCatalogo(); }, 300); });
['#tipo', '#orden'].forEach(selector => $(selector).addEventListener('change', () => { estado.pagina = 1; mostrarCatalogo(); }));
$('#limpiar').addEventListener('click', () => {
  clearTimeout(temporizador);
  $('#filtros').reset(); estado.pagina = 1; estado.favoritos = false;
  $('#ver-favoritos').setAttribute('aria-pressed', 'false'); $('#explorar').setAttribute('aria-current', 'page');
  mostrarCatalogo();
});
$('#ver-favoritos').addEventListener('click', () => {
  estado.favoritos = !estado.favoritos; estado.pagina = 1;
  $('#ver-favoritos').setAttribute('aria-pressed', estado.favoritos);
  if (estado.favoritos) $('#explorar').removeAttribute('aria-current'); else $('#explorar').setAttribute('aria-current', 'page');
  mostrarCatalogo(); $('#catalogo').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
});
$('#explorar').addEventListener('click', () => { if (estado.favoritos) $('#limpiar').click(); });
$('#anterior').addEventListener('click', () => { estado.pagina--; mostrarCatalogo(); $('#catalogo').scrollIntoView(); });
$('#siguiente').addEventListener('click', () => { estado.pagina++; mostrarCatalogo(); $('#catalogo').scrollIntoView(); });
$('#reintentar').addEventListener('click', () => estado.catalogo.length ? mostrarCatalogo() : iniciar());
document.addEventListener('click', evento => {
  const favorito = evento.target.closest('[data-favorito]');
  const ficha = evento.target.closest('[data-pokemon]');
  if (favorito) alternarFavorito(Number(favorito.dataset.favorito));
  else if (ficha) abrirFicha(Number(ficha.dataset.pokemon));
});
$('#cerrar-ficha').addEventListener('click', () => $('#ficha').close());
$('#ficha').addEventListener('click', evento => { if (evento.target === $('#ficha')) { const r = $('#ficha').getBoundingClientRect(); if (evento.clientX < r.left || evento.clientX > r.right || evento.clientY < r.top || evento.clientY > r.bottom) $('#ficha').close(); } });
$('#aleatorio').addEventListener('click', () => abrirFicha(Math.floor(Math.random() * 151) + 1));
actualizarCuenta();
iniciar();
obtenerPokemon(25).then(pokemon => {
  const imagen = $('#imagen-destacada'); imagen.src = pokemon.imagen; imagen.alt = 'Ilustración de Pikachu'; imagen.hidden = false;
  imagen.addEventListener('error', () => { imagen.hidden = true; }, { once: true });
}).catch(() => { $('#imagen-destacada').hidden = true; });
