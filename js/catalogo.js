export function filtrarCatalogo(catalogo, { busqueda = '', idsTipo = null, favoritos = null, orden = 'numero' } = {}) {
  const consulta = busqueda.trim().toLowerCase();
  const numero = /^#?\d+$/.test(consulta) ? Number(consulta.replace('#', '')) : null;
  return catalogo.filter(item =>
    (!consulta || (numero !== null ? item.id === numero : item.nombre.includes(consulta))) &&
    (!idsTipo || idsTipo.has(item.id)) && (!favoritos || favoritos.has(item.id))
  ).sort((a, b) => orden === 'nombre' ? a.nombre.localeCompare(b.nombre) : a.id - b.id);
}

export function paginar(elementos, pagina, tamano = 12) {
  const paginas = Math.max(1, Math.ceil(elementos.length / tamano));
  const actual = Math.min(Math.max(pagina, 1), paginas);
  return { elementos: elementos.slice((actual - 1) * tamano, actual * tamano), pagina: actual, paginas, total: elementos.length };
}
