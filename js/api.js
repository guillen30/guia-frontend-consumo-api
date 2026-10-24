const BASE = 'https://pokeapi.co/api/v2/';
const memoria = new Map();
const pendientes = new Map();
const DURACION = 24 * 60 * 60 * 1000;

export class ErrorServicio extends Error {
  constructor(mensaje, estado = 0) {
    super(mensaje);
    this.name = 'ErrorServicio';
    this.estado = estado;
  }
}

function leerCache(clave) {
  if (memoria.has(clave)) return memoria.get(clave);
  try {
    const entrada = JSON.parse(sessionStorage.getItem('pokedex:' + clave));
    if (entrada && Date.now() - entrada.fecha < DURACION) {
      memoria.set(clave, entrada.datos);
      return entrada.datos;
    }
  } catch { /* El catálogo funciona aunque el almacenamiento no esté disponible. */ }
}

async function consultar(ruta, transformar = datos => datos) {
  const guardado = leerCache(ruta);
  if (guardado) return guardado;
  if (pendientes.has(ruta)) return pendientes.get(ruta);
  const tarea = (async () => {
    const control = new AbortController();
    const limite = setTimeout(() => control.abort(), 12000);
    try {
      const respuesta = await fetch(BASE + ruta, { signal: control.signal });
      if (!respuesta.ok) {
        throw new ErrorServicio(respuesta.status === 404 ? 'No se encontró ese Pokémon.' : 'PokéAPI no pudo responder. Inténtalo de nuevo.', respuesta.status);
      }
      const datos = transformar(await respuesta.json());
      memoria.set(ruta, datos);
      try { sessionStorage.setItem('pokedex:' + ruta, JSON.stringify({ fecha: Date.now(), datos })); } catch { /* Caché en memoria como alternativa. */ }
      return datos;
    } catch (error) {
      if (error instanceof ErrorServicio) throw error;
      throw new ErrorServicio(error.name === 'AbortError' ? 'La consulta tardó demasiado. Inténtalo de nuevo.' : 'No se pudo conectar con PokéAPI. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      clearTimeout(limite);
      pendientes.delete(ruta);
    }
  })();
  pendientes.set(ruta, tarea);
  return tarea;
}

export function obtenerCatalogo() {
  return consultar('pokemon?limit=151&offset=0', datos => datos.results.map((item, indice) => ({ id: indice + 1, nombre: item.name })));
}

export function obtenerTipo(tipo) {
  if (!/^[a-z]+$/.test(tipo)) return Promise.reject(new ErrorServicio('Tipo no válido.'));
  return consultar('type/' + tipo, datos => datos.pokemon.map(item => Number(item.pokemon.url.split('/').filter(Boolean).pop())).filter(id => id <= 151));
}

export function obtenerPokemon(id) {
  if (!Number.isInteger(Number(id)) || Number(id) < 1 || Number(id) > 151) return Promise.reject(new ErrorServicio('Elige un número entre 1 y 151.'));
  return consultar('pokemon/' + Number(id), datos => ({
    id: datos.id,
    nombre: datos.name,
    imagen: datos.sprites.other?.['official-artwork']?.front_default || datos.sprites.front_default,
    tipos: datos.types.map(item => item.type.name),
    altura: datos.height / 10,
    peso: datos.weight / 10,
    habilidades: datos.abilities.map(item => item.ability.name),
    estadisticas: datos.stats.map(item => ({ nombre: item.stat.name, valor: item.base_stat }))
  }));
}
