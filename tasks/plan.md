# Plan: rediseño del panel Frida (versión 2, sobre la previa aprobada)

> Reemplaza al plan anterior ("quitar señales de plantilla"), que el usuario dio por insuficiente el 2026-11-04. De aquel quedan aplicados en el código, sin commit: encabezados sin rótulo, `TarjetaCifra` sin icono, la barra superior sin navegación, la tipografía Cabin, los iconos vivos en `ui/button` y el aviso desplegable de Llegadas. Este plan los absorbe o los reemplaza.

## Resumen

Rehacer el aspecto y el movimiento del panel de reservas siguiendo la previa v3 (https://claude.ai/artifact/Wf1XcAy5pEPNXN95iiN1N6), con componentes reales de **devl.dev** y **coss.com/ui** instalados tal cual. **Se quedan:** React 19 + Vite, Tailwind v4, shadcn para la website, la paleta floral, todas las funciones, la URL como fuente de verdad, las páginas vivas (`<Activity>`) y los modos de accesibilidad. **Fuera del alcance:** Restaurante, Tienda y Ventas (no se editan) y la website oculta.

## Decisiones (del usuario, 2026-11-04)

- **Lenguaje visual de la previa v3:** armazón "inset" centrado (1480 px de ancho máximo), suelo cálido y hoja blanca, botones-pastilla neutros, elemento activo como ficha blanca con borde. El morado lleno solo en UNA acción por pantalla, en los datos y en lo seleccionado. El color de estado (cada estado tiene su flor) y de propiedad (Chelem turquesa, Chuburná orquídea) se repite en todo el panel.
- **Navegación solo en la barra lateral.** La barra superior lleva migas, el lanzador (Ctrl K), los avisos, el tema y "Nueva reserva".
- **Movimiento con sentido:**
  - Bajar en la lista hace entrar la pantalla desde abajo y subir, desde arriba.
  - Los paneles completos (habitación, formularios, nueva reserva) nacen del botón que los abrió y al volver salen hacia la derecha.
  - Los globos (lanzador, avisos) crecen desde su botón.
- **Botones vivos sin seguir al ratón:** relleno que nace por donde entra el cursor, aplastado al presionar, gotitas al soltar e iconos que hacen su gesto.
- **Tema:** cortina circular desde el botón, sin parpadeo (transiciones apagadas durante el cambio) y un morado más profundo en oscuro.
- **devl.dev y coss.com/ui se instalan tal cual**, con sus dependencias `motion`, `lucide-react` y `@base-ui/react`. Convivirán dos juegos de iconos (Phosphor y Lucide) y dos de primitivas (Radix y Base UI): el usuario lo acepta.
- **Todo lo de React Bits en el panel se reemplaza por devl.dev**, más componentes extras de devl donde aporten (tabla de abajo). La website oculta conserva React Bits; sus archivos en `components/bits/` no se borran.
- **Nunca tablas.** Llegadas y salidas, paginada por columna (página en la URL).

## React Bits → devl.dev (lo que se reemplaza)

| Hoy (React Bits) | Dónde | Pasa a (devl.dev) |
|---|---|---|
| RubberSegment, JellyRadio | escala del Calendario, filtros | `liquid-segments` |
| BellToggle | campana de avisos | `notification-centre` (+ `drip-badge` en el contador) |
| AnimatedList | actividad, avisos | `elastic-list` / `toast-deck` |
| CountUp, Counter | cifras | `odometer` |
| SpotlightCard | tarjetas de cifra | `metric-card` |
| GlideSelect (`Selector`) | selectores del panel | menú y selector de coss |
| SquishSwitch, SpringCheck | interruptores y casillas | `liquid-switch`, `liquid-checkbox` |
| HoldButton | cancelar con confirmación | `go-no-go` / `split-button` |
| Stepper | pasos de un formulario | `step-flow` |
| WarmTooltip (`Pista`) | globos de ayuda | tooltip de coss |
| Magnet (en `BotonDestacado`) | acción principal | se quita (al usuario no le gusta que siga al ratón); queda `droplet-button` + `press-ripple` |

## Piezas de devl/coss y dónde van

| Pieza | Uso en el panel |
|---|---|
| `inset-shell` | Armazón y barra lateral (selector de propiedad, puntos de color, plegado) |
| `launcher` | Buscador Ctrl K que crece desde su botón |
| `notification-centre` | Avisos que nacen de la campana |
| `liquid-slider` | Meses y días que se ven en las gráficas del Tablero |
| `liquid-segments` | Día / Semana / Mes, filtros de propiedad y de periodo |
| `liquid-switch`, `liquid-checkbox` | Interruptores y casillas |
| `droplet-button`, `press-ripple` | Comportamiento de los botones |
| `odometer` | Cifras que ruedan |
| `morph-icons` | Sol ↔ luna, menú ↔ cerrar |
| `article-cards` | Habitaciones |
| `lift-to-open` | Paneles completos que nacen de su tarjeta o botón |
| `team-grid` | Personal |
| `connectors` | Otras plataformas |
| `ink-stamp` | Sello "Pagado" al cobrar |
| `range-calendar`, `money-input` | Nueva reserva y cobros |

**Componentes extras** (pedidos por el usuario), cada uno donde resuelve algo real:

| Extra | Dónde y para qué |
|---|---|
| `since-you-left` | Tablero: qué cambió desde tu última visita (reservas nuevas, pagos, cancelaciones) |
| `skeleton-sweep` | Carga de todas las pantallas, con un barrido de luz sobre la silueta real |
| `bell-quiet`, `search-scan`, `no-results`, `empty-bag` | Estados vacíos ilustrados (sin avisos, búsqueda sin resultados, nadie en casa) |
| `confetti-burst` | Al confirmar una reserva nueva |
| `split-button` | "Cobrar" con opciones (1 noche… liquidar), en lugar de botones sueltos |
| `card-deal` | Entrada de las rejillas de habitaciones y de personal |
| `toast-deck` | Los avisos en vivo (hoy con sonner) |
| `drip-badge` | Contadores de la barra lateral |
| `connection-lost` | Aviso cuando se cae la conexión en vivo (SSE) |
| `shortcut-sheet` | Atajos del panel con `?` |
| `filter-bar` / `saved-views` | Filtros del Calendario y de Habitaciones |

**Pedidos por el usuario el 2026-11-04 (de los prompts de devl):**

| Pieza | Dónde |
|---|---|
| `tally-hero` | Tablero: "Ingresos del mes". La cifra rueda mientras se imprime su desglose (noches, cobrado, por cobrar) y el selector de periodo lo recalcula; el total cuadra con las líneas |
| `liquid-cursor` | Dentro de la tarjeta de la corona de hoy: la gota toma la forma de la flor que señalas (solo en esa tarjeta, se apaga con reducir movimiento) |
| `prompt-bar` (la caja de `assistant-start`) | Nota interna de una reserva y búsqueda rápida, con huésped, habitación y fechas como contexto. **Sin IA**: el panel no tiene modelo, y fingir que "entiende" una reserva escrita sería engañoso |
| `radial-gauge` | Ocupación de hoy |
| `split-card` | Por cobrar: el total y de qué está hecho |
| `donut-legend` | Cómo pagan los huéspedes |
| `streak-heatmap` | Ocupación del año, día por día |

**Segunda tanda del usuario (2026-11-04):**

| Pieza | Dónde |
|---|---|
| `bell-quiet` | Estado vacío de Avisos |
| `pour-progress` | Ocupación de hoy: un vaso que se llena |
| `growth-chart` | Momento de "mes récord" en el Tablero, solo si el mes supera a todos los anteriores |
| `prompt-test-bench`, `metric-card` | Referencia para cambiar las barras del Tablero (al usuario no le gustan) por gráficas de línea con meta |
| `liquid-cursor` | Con objetivos marcados (`data-liquid-target`): la gota toma la forma de lo presionable |

La "corona de hoy" (las 12 habitaciones como flores del logotipo) es propia: no viene de ningún registro.

## Paginación real de Llegadas y salidas (2026-11-04, pedido del usuario)

`GET /api/admin/reservas` no pagina (hasta 1,000 filas): con muchas reservas, Llegadas sería lenta y pasando el tope faltarían huéspedes sin avisar. Hecho: `GET /api/admin/reservas/recepcion?columna=llegan|en_casa|salen|sin_llegada&cursor=&limite=`, por cursor de doble sentido (clave de fecha, id y sentido) con `meta.siguiente`, `meta.anterior` y `meta.total`. Las reglas de cada columna viven en el servidor. El cursor va en la URL; botones Anterior y Siguiente. Pruebas en `backend/tests/integracion/test_recepcion.py`. El Tablero sigue usando la ventana de 60 días para la corona: son pocas filas por habitación.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El contenedor no llega a `devl.dev` (sí llega a shadcn, React Bits y coss) | Alto | Spike F0: el host descarga el JSON del registro y el contenedor lo instala desde un archivo local o desde un servidor del host |
| Las dependencias de coss se llaman como las de shadcn (`button`, `badge`, `tooltip`, `menu`…) y **sobrescribirían `components/ui/`**, que usa la website | Alto | F0 decide una carpeta propia (`components/coss/`, con su propio `components.json` o `--path`) y comprueba con `git status` que `ui/` no cambió |
| Los archivos llegan en TSX y el proyecto es JS (`tsx: false`) | Medio | shadcn los convierte al instalar; F0 lo verifica |
| Base UI y Radix conviven: dos portales, dos sistemas de foco | Medio | Cada pantalla usa uno; el foco y el Escape se prueban en cada checkpoint |
| La regla "hover solo por sombra, nada de `translateY`" (CLAUDE.md y `SISTEMA-DE-DISENO.md`) choca con el movimiento pedido | Medio | Se cambia la regla en los documentos (F8), con fecha y motivo |
| Las transiciones con dirección contra las páginas vivas (`<Activity>`): una página que vuelve no debe remontarse | Medio | La dirección se calcula en `AdminApp` y se aplica como clase de entrada en `.pagina-admin`; nunca un `key={page}` |
| Contraste AA de los tintes nuevos en las cuatro combinaciones de tema | Medio | Se mide cada par con el script de contraste antes de cerrar cada fase |
| Peso del bundle (`motion` y `lucide` además de `framer-motion` y Phosphor) | Bajo | Se compara el tamaño del build antes y después de F0 y F2 |

## Cómo se verifica (en cada tarea)

- `DEV="docker compose -f docker-compose.dev.yml exec -T frontend-dev"; $DEV npm run lint && $DEV npm run build`
- Capturas con sesión: `node .taste-skill/capturas.mjs <carpeta> <pantallas> 1440,768,390`, en claro y oscuro, comparadas con la previa.
- `node .taste-skill/scroll-x.mjs`, adaptado al panel: sin scroll horizontal en ninguna pantalla.
- Los flujos de esa pantalla probados a mano o con Playwright, sin romper datos.
- Contraste AA de los pares nuevos en claro, oscuro, alto contraste y oscuro con alto contraste.

## Fases (detalle y criterios en `tasks/todo.md`)

- **F0** Spike: instalar `liquid-slider` de punta a punta sin tocar `components/ui/` → **Checkpoint con el usuario**
- **F1** Armazón: tokens, inset centrado, barra lateral, barra superior, tema
- **F2** Sistema de interacción: botones, segmentos, interruptores, transiciones con dirección y paneles que nacen de su botón → **Checkpoint**
- **F3** Tablero
- **F4** Llegadas y salidas
- **F5** Calendario → **Checkpoint**
- **F6** Habitaciones (tarjetas, detalle, formulario y fotos)
- **F7** Personal, Otras plataformas, Avisos, Auditoría, Configuración, Mi cuenta, Nueva reserva y detalle de reserva
- **F8** Limpieza y documentos → **Checkpoint final**
