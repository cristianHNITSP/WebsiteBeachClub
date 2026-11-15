# Tareas: rediseño del panel Frida (versión 2)

Verificación común: lint + build limpios; capturas en claro y oscuro (1440, 768 y 390) comparadas con la previa v3; sin scroll horizontal; los flujos de la pantalla probados; AA medido en los pares nuevos. `DEV="docker compose -f docker-compose.dev.yml exec -T frontend-dev"`. Restaurante, Tienda y Ventas no se editan. Cada pieza de React Bits que se toque se cambia por su reemplazo de devl (tabla en `plan.md`).

## F0 Spike de instalación (S)
- [x] El contenedor instala `liquid-slider` desde un JSON local o desde un servidor del host (devl.dev no responde desde el contenedor)
- [x] Las dependencias de coss van a una carpeta propia: `git status` muestra `components/ui/` SIN cambios
- [x] El archivo llega en JSX, compila y se ve en una página de prueba
- [x] Anotado el tamaño del build antes y después
Archivos: `frontend/components.json` (o uno propio para coss), `frontend/package.json`, `src/components/devl/`, `src/components/coss/`.
Hallazgos: (1) el contenedor no tiene IPv6 y un corte pasajero por IPv4 fue el fallo del primer intento; hoy instala bien. (2) `scripts/devl-add.sh` + `components.devl.json` mandan coss a `components/coss/` y devl a `components/devl/`: `ui/` intacto (probado con `notification-centre`, que pisaba `ui/button` y `ui/tabs`). (3) `motion` fijado en 12.43.0, la misma versión que `framer-motion`: una sola copia (+5.9 kB; sin fijarlo eran +146 kB). (4) Las piezas leen `var(--color-*)` en `:root`, donde `--primary` aún es el verde azulado viejo de `index.css`: arreglarlo es lo primero de F1a. (5) El deslizador controlado perdía pulsaciones rápidas: con `defaultValue` + escribir en la URL funciona (`?meses=6` sobrevive a la recarga).
**→ Checkpoint con el usuario: cómo se instalan las piezas y cuánto pesan.**

## F1 Armazón (M, en dos partes)
### F1a Tokens y armazón inset
- [x] Redeclarar `--color-*` de Tailwind junto a la paleta (`body.site`), para que devl/coss lean el morado y no el verde azulado de `index.css`
- [x] Tokens del panel (`body.panel`): suelo, hoja, alzado, hundido, borde, tinta, suave, tenue, acento, dato y dato-suave, con el morado profundo en oscuro y alto contraste medido
- [x] Armazón centrado de 1480 px como máximo: barra lateral sobre el suelo y la hoja con borde; al alejar a 20% queda centrado
Archivos: `admin/admin.css`, `website/site.css` (solo los tokens nuevos), `admin/AdminLayout.jsx` y `.module.css`.
### F1b Barra lateral y barra superior
- [x] El selector de propiedad abre su menú de verdad (Todas, Chelem, Chuburná) y cambia `propiedadActual` (en la previa solo era dibujo)
- [x] Barra lateral (base `inset-shell`): selector de propiedad arriba (el de `propiedadActual.js`), grupos, contadores en vivo con `drip-badge` (llegadas de hoy, avisos sin leer, doble venta), propiedades con su punto de color, "Restaurante: Pronto" apagado y la cuenta abajo
- [x] Plegado pulido: solo iconos centrados, globo con el nombre, tecla `[`, recordado por persona
- [x] Barra superior: migas, lanzador (`launcher`) con ir a pantallas y acciones, avisos (`notification-centre`) que nacen de la campana, tema con `morph-icons` y la cortina sin parpadeo, y "Nueva reserva" como única acción rellena
- [ ] (pendiente, pasa a F2) `shortcut-sheet` con `?` y `connection-lost` cuando se cae la conexión en vivo
- [x] Fuera BellToggle, GlideSelect, WarmTooltip y los demás de React Bits en el armazón (TopNav y SideNav ya no se usan; se borran en F8)
  Notas F1: la campana va con `drip-badge` a Avisos (el `notification-centre` guarda su propio estado: se cablea a la API en F7b). Morado del panel en oscuro: #9A5FE6 con tinta encima (4.76) y como texto (4.5). Estados de coss (info, éxito, advertencia, error) con las flores. Sin preflight en site.css: las listas de coss muestran números (corregido en la miga; vigilar en cada pieza). El lanzador trae textos en inglés (navigate, run, close): pendiente decidir si se traducen editando la pieza.
Archivos: `admin/components/SideNav.*`, `TopNav.*`, `components/marca/BotonTema.jsx`, `lib/transicionTema.js`, `lib/eventos.js` (solo para el estado de conexión).

## F2 Sistema de interacción (M, en dos partes)
### F2a Controles
- [x] (hecho a medias, ver nota) Botón del panel: pastilla neutra, relleno desde el cursor, aplastado, gotas (`droplet-button` / `press-ripple`) e iconos vivos; variante acento, una por pantalla; `BotonDestacado` sin Magnet
- [x] `liquid-segments` en lugar de JellyRadio y RubberSegment (Calendario, Avisos, Personal, Habitaciones) y `odometer` en lugar de CountUp (hecho); pendiente: `liquid-switch` y `liquid-checkbox` en lugar de SquishSwitch y SpringCheck; `odometer` en lugar de CountUp y Counter; `split-button` para cobrar
- [x] `skeleton-sweep` como esqueleto de carga del panel; `toast-deck` en lugar de los toasts sueltos
  Nota F2a: todo el panel (20 pantallas) usa el `Button` de coss; `ui/button.jsx` de shadcn volvió a su original (lo usa la website). Acción principal de pantalla y de fila: `DropletButton` de devl (primario o neutro). Letras del panel: Geist y Geist Mono (las de devl). `--secondary` del panel es el gris de coss; el dorado de aviso se nombra `--flor-dorado` / `--warning-foreground`. Falta: segmentos, interruptores, odómetro, ripple y esqueletos.
Archivos: `src/components/panel/` (nuevos, envuelven a devl/coss), `components/ui/button.jsx` (revertir los iconos vivos si se mudan al botón del panel), `components/marca/BotonDestacado.*`.
### F2b Transiciones
- [x] Dirección por orden de la barra lateral: entra desde abajo o desde arriba; las páginas vivas no se remontan
- [x] TODOS los formularios son paneles que nacen de su botón (como el detalle de Habitaciones de la previa): Nueva reserva, Nueva habitación, Editar habitación, Invitar/editar persona, Conectar plataforma, Cobrar
- [x] Paneles completos (`FULL_PAGES`) nacen del rectángulo del botón o tarjeta que los abrió (`lift-to-open`) y al volver salen hacia la derecha; `NavGuardModal` sigue protegiendo los cambios sin guardar
- [ ] `card-deal` en la entrada de las rejillas; todo se apaga con reducir movimiento
Archivos: `admin/AdminApp.jsx`, `admin/admin.css`, `src/components/panel/`.
  Nota F2b: probado con Playwright (Tablero→Habitaciones entra desde abajo, Habitaciones→Llegadas desde arriba; Nueva reserva crece desde su botón y al volver sale a la derecha con popLayout). Las 23 piezas pedidas quedaron instaladas (34 en `components/devl/`).
**→ Checkpoint con el usuario: armazón y controles en la app real.**

## F3 Tablero (M)
- [ ] `tally-hero` en Ingresos del mes, `radial-gauge` en ocupación de hoy, `split-card` en Por cobrar, `donut-legend` en Cómo pagan, `streak-heatmap` para el año, `liquid-cursor` en la corona
- [x] La corona de hoy con datos reales (habitaciones y su estado de hoy, de la API), tocable y accesible con el teclado
- [x] Cifras con `odometer` / `metric-card`; ingresos y ocupación con `liquid-slider` (de 3 a 12 meses y de 3 a 14 días, recortado en el cliente)
- [ ] `since-you-left`: qué cambió desde tu última visita
- [ ] Llegan hoy con saldo (con Cobrar) y Actividad reciente (`elastic-list`) con iniciales en su tono
Archivos: `admin/pages/DashboardPage.*`, `admin/components/Corona.jsx` (nuevo), `Graficas.*`.

## F4 Llegadas y salidas (M)
- [x] Tarjetas de huésped con chips (vencido, debe, todo pagado, propiedad), nunca tablas
- [x] Paginación por columna con la página en la URL (`?llegan=2`), renderizando solo la página visible
- [ ] Cobrar con `split-button` y sello "Pagado" (`ink-stamp`) cuando la API confirma; los mismos flujos de check-in, cobro y check-out que hoy
- [ ] "Nadie en casa" con ilustración vacía de devl
Archivos: `admin/pages/HoyPage.*`, `admin/components/OpcionesCobro.*`.

## F5 Calendario (M)
- [x] `liquid-segments` para la escala, `filter-bar` para los filtros (con conteo), la línea de hoy en morado
- [x] Cada estado con su marca (confirmada rellena, en curso tinte, pendiente con contorno dorado, externa y bloqueo rayados); `EsqueletoLineaTiempo` igual a la vista
- [x] Arrastrar, estirar, mover con el teclado y crear desde un hueco siguen funcionando
Archivos: `admin/components/LineaTiempo.*`, `admin/pages/CalendarPage.jsx`.
**→ Checkpoint con el usuario.**

## F6 Habitaciones (M)
- [x] Lista con `article-cards` (una destacada, portadas dibujadas por tipo y propiedad, o la foto real si existe con `Imagen`), `card-deal` al entrar y `saved-views` para filtrar
- [x] El detalle nace de la tarjeta y sale hacia la derecha; formulario y gestión de fotos con el mismo lenguaje
Archivos: `RoomsPage.*`, `HabitacionFormPage.jsx`, `GestionFotos*`.

## F7 El resto del panel (L, en tres tareas)
- [x] F7a Personal (`team-grid`) y su formulario (`step-flow` si tiene pasos)
- [x] F7b Otras plataformas (`connectors`), Avisos (`notification-centre` a pantalla completa, `bell-quiet` vacío) y Auditoría
- [x] F7c Nueva reserva (`range-calendar`, `money-input`, `confetti-burst` al confirmar, `prompt-bar` para la nota interna), detalle de reserva y cobros, Configuración (pestañas, sitios web, tarifas) y Mi cuenta

## F8 Limpieza y documentos (S)
- [x] `docs/PLAN-BACKEND.md`: el endpoint `/api/admin/reservas/recepcion` y su cursor de doble sentido
- [x] Ninguna página del panel importa de `components/bits/`; la website sigue compilando con ellos
- [x] `docs/SISTEMA-DE-DISENO.md`: el lenguaje nuevo del panel, las reglas de movimiento (permitido el desplazamiento corto y con sentido) y el uso de devl/coss
- [x] `CLAUDE.md` actualizado (estilos, componentes base e iconos del panel)
Notas finales (2026-11-05). No se usaron, con motivo: `filter-bar` (amarrado a "issues" y con dos dependencias: los filtros son `liquid-segments` con conteo), `team-grid` (sitio de marketing, sin acciones: Personal son tarjetas propias con `card-deal`), `prompt-bar` (modelos, adjuntos y voz falsos), `range-calendar` (pensado para analítica: sigue `SelectorFechas`), `shortcut-sheet` (encierra una región, no sirve para todo el panel), `connection-lost` (promete cambios guardados en el dispositivo: un aviso de la baraja dice lo real), `since-you-left`, `tally-hero`, `split-card`, `radial-gauge`, `streak-heatmap` (el Tablero ya cubre esos datos o la API no los da). Quedan instaladas por si se quieren después.
**→ Checkpoint final: antes y después de cada pantalla, todos los flujos probados.**

## F9 Ajustes tras la revisión (2026-11-05)
- [x] Cursor del Tablero: faltaba `--color-brand` y la gota quedaba detrás de la tarjeta
- [x] Buscador como el de la previa (`GloboBuscar`), Launcher solo en móvil, sin scroll detrás
- [x] Fuera "Propiedades" de la barra lateral; ficha y menú de propiedad como una sola pieza
- [x] Botón primario con doble contorno y ola; todos los botones en pastilla, con relleno, onda y gotitas
- [x] Iconos con gesto en toda la barra, botones y avisos; flores que giran y coronas que se mecen
- [x] Paneles que nacen del elemento y regresan a él (`transicionPanel.js`)
- [x] Habitaciones igual a la previa (cabecera con herramientas, tarjeta sin marco interior, renglón de hoy)
- [x] Llegadas igual a la previa: pie de página siempre visible, Cobrar con monto, sello al liquidar
- [x] Avisos con el resumen del Tablero (`Celda` compartida, `MetricCard` de la semana)
- [x] Login nuevo con las piezas del panel; fuera Aurora, SplitText y SpotlightCard
- [x] Corregido: el vacío de Papelera tapaba su cabecera; faltaba importar `SkeletonReservationList`
