# Pokédex Kanto

Portal para explorar los 151 Pokémon de Kanto. Permite buscar por nombre o número, filtrar por tipo, consultar estadísticas y guardar favoritos en el navegador. Los datos y las ilustraciones proceden de [PokéAPI](https://pokeapi.co/).

## Ejecutar

Requiere Node.js 22 o posterior y un navegador moderno.

```sh
npm start
```

Abrir [http://127.0.0.1:8080](http://127.0.0.1:8080). No hay dependencias que instalar ni un proceso de compilación. También puede servirse el contenido con otro servidor HTTP estático. Los módulos JavaScript necesitan HTTP; abrir `index.html` directamente con `file://` no es suficiente.

El puerto se puede cambiar mediante la variable de entorno `PORT`. Las consultas nuevas y las ilustraciones requieren conexión a Internet.

## Funciones

- Búsqueda parcial por nombre y búsqueda exacta por número, con formatos como `25`, `025` o `#025`.
- Filtro por los tipos presentes en Kanto y orden por número o nombre.
- Catálogo dividido en páginas de doce Pokémon.
- Fichas con tipos, altura, peso, habilidades y seis estadísticas base.
- Favoritos almacenados en `localStorage`, disponibles después de recargar la página.
- Selección aleatoria de un Pokémon del catálogo.
- Estados de carga, búsquedas sin resultados y recuperación de consultas fallidas.

La búsqueda, el tipo y la selección de favoritos se combinan. «Limpiar filtros» restaura el catálogo completo. Las habilidades conservan los nombres devueltos por el servicio; los tipos y las etiquetas de estadísticas se presentan en español.

## Consumo del servicio

El cliente utiliza `fetch`, `async/await` y respuestas JSON de la API REST v2:

| Recurso | Uso |
| --- | --- |
| `pokemon?limit=151&offset=0` | Índice de nombres y números |
| `pokemon/{id}` | Imágenes, tipos, medidas, habilidades y estadísticas |
| `type/{tipo}` | Identificadores para filtrar el catálogo |

Las consultas comprueban `response.ok` y se cancelan después de doce segundos con `AbortController`. Los datos se guardan en memoria y en `sessionStorage` para reutilizarlos durante la sesión; las entradas persistidas caducan a las 24 horas. Las peticiones simultáneas al mismo recurso comparten una promesa. Si el almacenamiento del navegador está bloqueado, el portal conserva los datos y favoritos en memoria durante la sesión.

Cada página solicita únicamente las fichas que necesita. `Promise.allSettled` permite mostrar las respuestas correctas aunque alguna consulta falle. Un contador de solicitudes evita que una búsqueda anterior reemplace resultados más recientes. El servicio no requiere credenciales.

## Estructura

```text
index.html           Interfaz y estructura semántica
css/estilos.css      Diseño y adaptación a distintos anchos
js/api.js            Consultas, caché y manejo de errores
js/catalogo.js       Filtrado, orden y paginación
js/app.js            Interacciones, favoritos y fichas
assets/pokeball.svg  Identidad gráfica
servidor.js          Servidor HTTP local
test/                Pruebas del cliente y el catálogo
```

La interfaz incluye etiquetas de formulario, avisos de estado, foco visible, enlace para saltar al catálogo y un diálogo que puede cerrarse con Escape. El diseño usa cuatro columnas en escritorio, tres en anchos intermedios y dos en móvil, y respeta la preferencia de movimiento reducido.

## Pruebas

```sh
npm test
```

Las once pruebas cubren búsqueda, combinación de filtros, orden, límites de paginación, conversión de medidas, caché, consultas simultáneas, validación y errores HTTP, de red y de tiempo de espera. Las pruebas del cliente simulan las respuestas y no dependen de la disponibilidad del servicio.

## Fuentes

- [Documentación de PokéAPI v2](https://pokeapi.co/docs/v2).
- Las ilustraciones se obtienen de las direcciones proporcionadas por PokéAPI.
- Pokémon y sus personajes pertenecen a Nintendo, Creatures y GAME FREAK. Este portal es un explorador no oficial.
