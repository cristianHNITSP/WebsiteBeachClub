# Sistema de diseño Hoteles Frida

> Contrato visual y técnico de `frontend/`. Cuando se diseñe o rehaga
> **cualquier** página, componente, modal, tarjeta o texto, se hace según este
> documento. Complementa a `CLAUDE.md`.
>
> **Origen:** reglas adaptadas del sistema de diseño de SIMDES, sobre la
> **marca Frida** (teal + dorado, Noto Serif + Manrope). Se conservan las
> reglas: tokens como única fuente, vidrio con alfa y no con `blur()`,
> separadores prohibidos, AA, claro/oscuro/alto contraste. Se descarta lo
> propio de SIMDES: Ionic, mapas, pieles iOS/Material, React Bits.
>
> **Dos paletas, un sistema.** El admin usa la paleta teal original
> (`src/index.css`). La **website** usa la paleta floral sacada del logo
> (§2.4, en `src/website/site.css`) y está construida con **shadcn/ui +
> React Bits** (§14). Las reglas son las mismas para las dos.
>
> El código actual **todavía no cumple** todo esto. Lo pendiente está
> inventariado en §12. Código nuevo o tocado: cumple. Código viejo: se migra
> al pasar por él.

---

## 1. Principios

1. **Elegante y sereno, no brillante.** Hotel de playa, no app de apuestas.
   Superficies claras y limpias, texto en `--on-surface*`, color de marca
   usado con intención. Nunca `#000` puro como texto de marca, nunca un color
   saturado directo fuera de la paleta.
2. **Tokens, cero hex.** Todo color, radio, sombra y fuente sale de
   `src/index.css`. Si falta un token, **se agrega ahí** (y a su espejo
   `src/tokens.js`), no se inventa en el componente.
3. **El color vive en el chip, el badge o el botón**, no en franjas. Estado
   activo = relleno tintado o elevación, jamás un `border-left` de acento.
4. **Jerarquía por tipografía, superficie y espacio**, no por caracteres
   decorativos (§3). Titulares en `--font-headline` (Noto Serif), todo lo
   demás en `--font-body` (Manrope).
5. **La elevación es SOLO por sombra.** Hover de tarjetas y botones = sube la
   sombra (`--shadow-sm` → `--shadow-md`). **Nada de `translateY` al hover**,
   ni `whileHover={{ y: … }}` de framer-motion: mueve el contenido bajo el
   cursor y hace temblar los bordes. Excepción: navegación y gestos (un
   carrusel que se arrastra, un panel que sigue al dedo).
6. **La translucidez se hace con ALFA, no con `backdrop-filter: blur()`.**
   Ver §1.1.

### 1.1 Vidrio: alfa sí, `blur()` no

El aspecto de vidrio se consigue con fondo semitransparente más un filo
interior:

```css
.glass {
  background: color-mix(in srgb, var(--surface) 72%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--outline-var) 60%, transparent),
              var(--shadow-sm);
}
```

Eso es composición alfa: prácticamente gratis.

`backdrop-filter: blur()` es otra cosa y es caro. El navegador saca una
instantánea de todo lo que hay detrás, le pasa un desenfoque gaussiano
multipaso y lo compone, **cada vez que el fondo cambia**. Una navbar fija con
`blur(24px)` sobre una página que hace scroll paga eso en cada cuadro del
scroll. En móviles de gama media se nota.

| Situación | Qué usar |
|---|---|
| Algo fijo sobre contenido que hace scroll (navbar, barra inferior, FAB) | Alfa. **Nunca `blur()`** |
| Algo que se mueve o se anima | Alfa |
| Muchas instancias (una por tarjeta) | Alfa |
| Un único modal quieto sobre un fondo quieto | `blur()` tolerable si aporta de verdad. Probar alfa primero |

No confundir con `filter: blur()` **sobre el propio elemento** en una
animación: ese desenfoca el elemento, no el fondo, y termina en 0. Aun así,
ver §10: en entradas no se usa.

---

## 2. Tokens

### 2.1 Dónde viven

| Archivo | Qué es |
|---|---|
| `src/index.css` | **Fuente canónica.** Variables CSS por tema |
| `src/tokens.js` | Espejo JS (`t.color.primary` → `'var(--primary)'`) para `style={{}}`. Solo referencias a variables, nunca valores |

Estructura de `index.css`, en este orden:

| Bloque | Selector | Contiene |
|---|---|---|
| Base clara | `:root` | colores, superficies, texto, bordes, fuentes, radios, sombras |
| Oscuro | `.dark` (en `<html>`) | lo que cambia en oscuro |
| Alto contraste | `.high-contrast` | refuerzos para AA en claro |
| Alto contraste oscuro | `.dark.high-contrast` | lo mismo en oscuro |

`ThemeContext` alterna esas clases en `<html>` y persiste en `localStorage`
(`frida-theme`, `frida-high-contrast`, …). Si la preferencia coincide con la
del sistema, se borra la clave para seguir a `prefers-color-scheme`.

**Regla:** un token que se usa como color de texto o icono **debe
redefinirse en `.dark`** si su valor claro no llega a AA sobre el fondo
oscuro. Hoy `--primary` no lo hace (§2.3).

### 2.2 Roles

| Token | Claro | Uso |
|---|---|---|
| `--primary` | `#006971` | marca, acción principal, enlaces |
| `--primary-dark` | `#004f57` | hover/pressed de primary |
| `--gold` | `#f59e0b` | acento de marca: estrellas, destacados, precio especial. **Solo relleno o sobre fondo oscuro** |
| `--gold-dark` | `#735c00` | dorado como **texto** sobre fondo claro |
| `--secondary` | `#c07ef0` | acento decorativo. **Nunca con texto blanco encima** |
| `--error` | `#ba1a1a` | error, acción destructiva |
| `--bg`, `--surface*` | | fondos, de más bajo a más alto |
| `--on-surface`, `--on-surface-var` | | texto fuerte, texto secundario |
| `--outline`, `--outline-var` | | bordes (`-var` = filo sutil) |
| `--radius-sm/md/lg/xl/full` | 4/8/12/20/9999 | `full` = pastillas y botones |
| `--shadow-sm/md/lg`, `--shadow-primary` | | elevación |

Faltan roles semánticos de estado (`success`, `warning`) y sus pares
tintados. El día que un estado lo necesite (reserva confirmada/pendiente),
se crean aquí como `--success` + `--tint-success` + `--tint-success-fg`
auditados a AA, en vez de un verde suelto en el componente.

**Patrón de chip tintado** (identidad o estado):

```css
background: var(--tint-primary);      /* fondo suave */
color: var(--tint-primary-fg);        /* texto que pasa 4.5:1 sobre ese fondo */
border-radius: var(--radius-full);
```

### 2.3 Contraste (WCAG AA)

Texto normal ≥ **4.5:1**, bordes y componentes de UI ≥ **3:1**. Auditoría de
los tokens actuales (2026-09-25):

| Par | Ratio | Estado |
|---|---|---|
| blanco sobre `--primary` | 6.44 | ✓ |
| `--primary` sobre `--bg` claro | 6.44 | ✓ |
| `--primary` sobre `--bg` **oscuro** | **2.77** | ✗ `.dark` no redefine `--primary` |
| `--surface-tint` oscuro (`#4dbac4`) sobre `--bg` oscuro | 7.77 | ✓ candidato a `--primary` en `.dark` |
| blanco sobre `--gold` | **2.15** | ✗ usar texto `--on-surface` (7.99) |
| `--gold-dark` sobre blanco | 6.44 | ✓ |
| blanco sobre `--secondary` | **2.81** | ✗ |
| `--secondary` sobre blanco | **2.81** | ✗ no sirve como texto |
| `--error` sobre blanco | 6.46 | ✓ |
| `--on-surface-var` sobre `--surface` (claro / oscuro) | 6.82 / 7.05 | ✓ |
| `--outline` sobre blanco (borde) | 3.32 | ✓ solo para bordes |
| `--outline` oscuro sobre `--bg` oscuro (borde) | **2.48** | ✗ bajo 3:1 |

Cómo arreglar un par que falla. Se decide según **si el color también se usa
suelto como texto o icono**:

- **A) Oscurecer la base** hasta que el blanco pase. Vía por defecto en
  **claro**: mejora a la vez el texto encima y el color como icono.
- **B) Dejar el color claro y poner texto oscuro encima.** Vía en **oscuro**:
  ahí el color también se usa como icono sobre fondo oscuro, y oscurecerlo lo
  hundiría. Acento claro + texto oscuro es lo estándar en temas oscuros.

Al añadir un color: calcular su par antes de usarlo, no copiar el del color de
al lado.

> **Ojo con el blanco fijo.** `color: '#fff'` sobre un relleno de marca es el
> error más repetido: en oscuro varios rellenos son claros y el texto
> desaparece. Usar el token de "texto sobre X".

### 2.4 Paleta de la website (floral, del logo de Cabañas Frida)

Vive en `src/website/site.css` y **solo aplica a la website y al login del
admin**: los tokens se declaran en `body.site`, clase que el hook
`usePaletaSitio()` (`src/hooks/`) pone en `<body>` al montar y quita al
desmontar (lo usan `WebsiteApp` y `LoginPage`). En `<body>` y no en un `div` porque los portales de Radix
(Select, Sheet, Tooltip, Toast) se montan en `<body>` y también la necesitan.
El resto del admin no la ve nunca.

Los mismos tokens alimentan a shadcn (`--primary`, `--card`, `--muted`…) y a
los heredados de §2.2 (`--surface*`, `--on-surface*`, `--gold`…), así que el
CSS viejo de la website se repintó sin tocarlo.

**Colores del logo** (constantes de marca, iguales en claro y oscuro, en
`:root` porque el WebGL y el canvas los leen antes de que exista `body.site`):

| Token | Hex | Del logo | Texto encima |
|---|---|---|---|
| `--flor-morado` | `#7A32C0` | letras FRIDA | blanco |
| `--flor-dorado` | `#E8A828` | marco | tinta |
| `--flor-naranja` | `#F89010` | cempasúchil | tinta |
| `--flor-rojo` | `#F5333A` | flor roja | **tinta** (blanco da 3.88) |
| `--flor-turquesa` | `#4EC8BC` | flor turquesa | tinta |
| `--flor-orquidea` | `#A848B8` | flor magenta | blanco |
| `--flor-hoja` | `#405818` | hojas | blanco |
| `--noche` | `#1A0F2E` | fondo del hero | `--noche-fg` / `--noche-fg-suave` |

Cada flor trae su `--flor-*-fg` ya auditado: úsalo siempre en vez de un
blanco fijo.

**Roles** (claro → oscuro; en oscuro, acento claro con tinta encima):

| Rol | Claro | Oscuro |
|---|---|---|
| `--primary` / `-foreground` | morado `#7A32C0` / blanco | lila `#B98AF0` / tinta |
| `--secondary` / `-foreground` | dorado `#E8A828` / tinta | `#F2BC4A` / tinta |
| `--accent` / `-foreground` | lavanda `#F2E8FB` / `#5A2296` | `#2E2140` / `#E4D2FA` |
| `--background` · `--card` · `--muted` | arena `#FFFBF5` · `#FFFFFF` · `#F7F0E6` | `#140F1A` · `#1E1727` · `#2A2134` |
| `--foreground` · `--muted-foreground` | `#1E1526` · `#645A70` | `#F7F1FB` · `#B8ADC6` |
| `--destructive` | `#C4262E` | `#FF6B70` |
| `--border` (decorativo) · `--input` (≥ 3:1) | `#E8DDD0` · `#8A7D96` | `#3A2F47` · `#85789A` |

Auditoría (todos ≥ 4.5:1 salvo bordes, ≥ 3:1): texto 17.1 / 17.0; texto
secundario 6.29 / 8.83; primario como texto 6.69 / 7.15; texto sobre primario
6.90 / 6.68; tinta sobre dorado 8.45 / 10.14; destructivo 5.56 / 6.82; borde
de input 3.73 / 4.27. Alto contraste (`.high-contrast body.site` y
`.dark.high-contrast body.site`) refuerza texto, bordes y primario.

**Tipografía** (website + login): las familias del logo, tres roles, sin
excepciones.

| Rol | Familia | Dónde |
|---|---|---|
| Logotipo | **Chewy** (`--font-display`) | SOLO "FRIDA" del `Wordmark` |
| Títulos, cifras, rótulos | **Oswald** (`--font-headline`) | títulos, precios grandes, contadores; rótulos con la clase `.rotulo` (mayúsculas, 500, `--tracking-rotulo`) |
| Texto e interfaz | **Cabin** (`--font-body`) | todo lo demás |

Escala única: `--fs-xs` 12 · `--fs-sm` 14 · `--fs-base` 16 · `--fs-lg` 18 ·
`--fs-xl` 22 · `--fs-2xl` 28 · `--fs-3xl` y `--fs-hero` fluidos. **Ningún
`font-size` en px o rem sueltos**: si falta un tamaño, se discute y se añade a
la escala. Nada de itálicas en Oswald (no la tiene: el navegador la inventa).

**Uso:** el morado es la acción; el dorado, lo destacado (enlace activo sobre
el hero, pastilla del rotador, flecha de sucursal); las flores dan
identidad a íconos, avatares y tarjetas (una flor por elemento, §4 "un solo
punto de color"). Una flor **nunca** comunica un estado: para eso están
`--destructive` y los roles.

---

## 3. Separadores PROHIBIDOS (texto visible)

Aplica a **todo lo que se ve**: JSX, datos mock, mensajes del futuro backend,
correos, PDFs.

**Nunca:**

- `—` (guion largo), ni separando ideas ni uniendo datos
- `|` y ` + ` sueltos
- Runs decorativos: `----`, `····`, `====`, `~~~~`
- Franjas o bordes de acento como separador
- `—` como "sin dato": escribir el texto real ("Sin dato", "Sin reservas",
  "No aplica")

**Sí, en este orden de preferencia:**

1. **Punto.** Donde había un guion largo casi siempre hay dos frases. "Sin
   habitaciones disponibles. Prueba otras fechas."
2. **Coma**, para lo que cuelga de una frase: "Suite Coral, 2 huéspedes",
   "Chuburná, Yucatán".
3. **Puntuación con significado.** Dos puntos para título y asunto
   ("Reserva: Suite Coral"), paréntesis para procedencia, flecha para un
   rango o un antes y después ("12 abr → 15 abr", `$3,200 → $2,900`).
4. **Tipografía** (peso, color, tamaño, espacio) en vez de cualquier carácter.
5. **Punto medio `·`** solo como último recurso, para datos sueltos del mismo
   rango en fila.

**Excepción:** cuando el signo es parte del dato (`-2 °C`, un teléfono
`+52 999…`, una fórmula).

---

## 4. Chips, badges e identificadores

- **`Badge`** (`components/frida`) para estados compactos y conteos.
- Estados con el **par tintado** (§2.2), no con texto gris ni color sólido
  saturado.
- **Folios** (reserva `BK001`, venta, habitación) en fuente mono dentro de una
  cápsula con etiqueta muted: "Reserva **BK001**". Así se lee qué es.
- **Un solo punto de color por fila.** Chip + texto plano + negrita, no una
  fila llena de chips.

---

## 5. Tarjetas y paneles

- Tarjetas: `GlassCard` / `SurfaceCard` / `ElevatedCard` (`components/frida`).
  No reinventar una tarjeta con un `<div>` y estilos sueltos.
- `GlassCard` se implementa con alfa (§1.1).
- Borde `1px var(--outline-var)` + `--shadow-sm`. Hover: **solo** sube la
  sombra.
- Cabecera de sección: `SectionHeader` / `PageHeader`, con título, hint y
  acciones, y un divisor real (`border-bottom`) si hace falta separar.
- Cifras del admin: `StatCard`. Tablas: `DataTable`.

---

## 6. Botones y estados de carga

- **Nunca un spinner encima del texto de un botón.** Mientras carga:
  `disabled` + el icono se sustituye por el spinner + la etiqueta se oculta
  (o pasa a progreso, "Guardando…"). **Ancho estable**, sin brinco.
- Acción destructiva: `ConfirmButton`, con el botón de confirmar en
  `--error`.
- Botón solo-icono: `aria-label` obligatorio. Si hay sitio, mejor con palabra.
- Carga de sección o tabla: `Skeleton*` (§9), nunca un spinner dentro de un
  chip o botón.

---

## 7. Formularios

- `Field` + `Input` / `Select` / `Textarea` (`components/frida`). Label
  siempre visible, no solo placeholder.
- Errores en **español humano** ("La fecha de salida debe ser después de la
  de entrada"), nunca el código crudo del backend.
- Teclado correcto en móvil: `inputMode="numeric"` para huéspedes o noches,
  `inputMode="decimal"` para precios, `type="email"`, `type="tel"`,
  `type="date"`.
- Unidades y moneda visibles junto al campo ("MXN", "noches"), no metidas en
  el placeholder.
- **El servidor es la verdad**: disponibilidad y precio final los confirma el
  backend. Lo que el cliente calcula antes es vista previa.

---

## 8. Responsive

- **Móvil primero.** Se diseña a 360 px y se expande.
- **Rejillas intrínsecas** en vez de columnas por breakpoint:
  `grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr))`.
  Cada bloque dice su ancho mínimo legible y caben los que caben.
- Escritorio: contenido a ancho máximo legible (~1200 px) y centrado.
- Objetivos táctiles **≥ 44 px**, aunque el botón se vea pequeño.
- Safe areas (`env(safe-area-inset-*)`) en todo lo fijo abajo o arriba.

---

## 9. Estados: vacío, carga, error

- **Vacío:** icono en círculo tintado + título + subtítulo + acción. Nunca una
  tabla vacía sin explicación.
- **Carga:** `Skeleton`, `SkeletonCard`, `SkeletonRoomCard`… con la **silueta
  real** de lo que va a llegar y **altura fija**, para que nada salte.
  `LoadingPage` solo para la carga inicial de una página entera.
- **Error:** mensaje humano + "Reintentar". Lo efímero va en aviso
  (`useToast`), el fallo persistente en el propio hueco del contenido.
- **Avisos:** siempre `useToast()` (`ToastProvider` ya está en `App.jsx`),
  nunca `alert()`.

---

## 10. Animación (framer-motion)

- **Entradas:** subida corta (≈10 px) + opacidad, ease-out ~0.4–0.5 s. Salida
  más corta (~0.2–0.3 s). La opacidad acompaña, no protagoniza.
- **Sin desenfoque en entradas** sobre algo quieto: se lee como pantalla
  borrosa, no como movimiento.
- **Hover sin desplazamiento** (§1.5): sombra, color, a lo sumo `scale` muy
  sutil.
- **Animación primero, datos después:** la petición se dispara tras la
  entrada, no durante.
- **Reducir movimiento:** `App.jsx` envuelve todo en
  `<MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>` y
  `.reduce-motion` anula animaciones y transiciones CSS. Toda animación nueva
  debe verse bien, o al menos no romperse, con eso activado.

---

## 11. Accesibilidad

`ThemeContext` expone cuatro preferencias, aplicadas como clases en `<html>`.
**Toda pantalla nueva debe funcionar con las cuatro activadas a la vez.**

| Preferencia | Cómo se aplica | Qué debe respetar tu componente |
|---|---|---|
| Oscuro | `.dark` | solo tokens. Nada de hex que no cambie |
| Tamaño de texto | `.font-small` / `.font-large` → `zoom` | hoy es `zoom` porque hay `px` inline. **Código nuevo en `rem`**; contenedores que crezcan, sin alto fijo en cajas de texto |
| Alto contraste | `.high-contrast` | solo tokens. Sin degradados ni texto a medio tono |
| Reducir movimiento | `.reduce-motion` + `MotionConfig` | §10 |

Además:

- `aria-label` en todo botón-icono. `aria-hidden="true"` en iconos
  decorativos (`material-symbols-outlined`, Phosphor).
- `role="status"` / `aria-live` en avisos y cargas.
- **Foco visible**: no quitar el `outline`. Si se personaliza, con
  `--outline` y `outline-offset`.
- Textos en español, humanos, sin jerga ni códigos.

---

## 12. Deuda actual (inventario 2026-09-25)

Lo que el código de `frontend/src` todavía no cumple. Se migra al tocar cada
archivo, no en un barrido a ciegas.

> **La website ya cumple** (rework 2026-09-25: cero hex salvo respaldos de
> `leerToken`, cero `blur()`, hover sin translate, sin `alert()`, sin `—`).
> Lo que sigue aplica al **admin**.

| Regla | Estado | Cómo buscarlo |
|---|---|---|
| §1.1 sin `blur()` | 17 archivos con `backdrop-filter: blur(…)` (6–24 px), incluidas navbars fijas | `grep -rn "backdrop-filter\|backdropFilter" src` |
| §1.5 hover sin translate | `Button` primary (`translateY(-1px)`), `RoomCard` (`whileHover y:-6`), `Footer` (`y:-2`), 9 reglas CSS con `translateY(-…)` | `grep -rn "translateY(-\|whileHover" src` |
| §2 cero hex | ~55 líneas de JSX con hex (`'#fff'`, `#009aa5`, `#8c1515`…) | `grep -rnE "#[0-9a-fA-F]{6}" src --include=*.jsx` |
| §2.3 contraste | `--primary` sin variante oscura, blanco sobre `--gold`/`--secondary`, `--outline` oscuro | tabla de §2.3 |
| §3 separadores | 39 archivos con `—` (parte en comentarios, que no importan; revisar el texto visible) | `grep -rln "—" src` |
| §11 tamaño de texto | por `zoom`, no por `rem` | `index.css`, `.font-small/.font-large` |
| §9 avisos | `WebsiteApp` confirma la reserva con `alert()` | `grep -rn "alert(" src` |

---

## 13. Checklist antes de dar por buena una pantalla

- [ ] ¿Colores, radios y sombras SOLO por tokens? (cero hex en JSX y CSS de componente)
- [ ] ¿Se ve bien en **claro, oscuro y alto contraste**, probado con el toggle?
- [ ] ¿Pares de texto/fondo nuevos auditados a 4.5:1 (§2.3)?
- [ ] ¿Cero `—`, `|`, ` + ` decorativos en texto visible? ¿"Sin dato" con texto real?
- [ ] ¿Translucidez con alfa, cero `backdrop-filter: blur()` en lo fijo o animado?
- [ ] ¿Hover solo por sombra, sin `translate`?
- [ ] ¿Botones de carga sin spinner encima del texto y con ancho estable?
- [ ] ¿Estados vacío, carga (skeleton con silueta real) y error cubiertos, sin saltos de altura?
- [ ] ¿Avisos con `useToast`, nunca `alert()`?
- [ ] ¿Se apila limpio a 360 px, objetivos táctiles ≥ 44 px, ancho máximo en escritorio?
- [ ] ¿Texto nuevo en `rem`?
- [ ] ¿Funciona con reducir movimiento activado?
- [ ] ¿`aria-label` en botones-icono, iconos decorativos `aria-hidden`, foco visible?
- [ ] ¿Textos en español humano, sin códigos crudos?

---

## 14. Website: shadcn/ui + React Bits

**Tailwind v4, sin preflight.** `site.css` importa solo `theme.css` y
`utilities.css`. Preflight cambiaría la tipografía y los botones del admin.
Las utilidades van **sin capa** a propósito: `index.css` pone
`* { margin: 0; padding: 0 }` sin capa y ganaría a cualquier utilidad en
capa. `site.css` se importa **primero** en `main.jsx`: ante empate de
especificidad, gana el `*.module.css`.

**Estructura intacta, elementos sustituidos.** Las páginas conservan sus
secciones, paneles y `*.module.css`; lo que cambió son las piezas:

| Antes (`components/frida`) | Ahora |
|---|---|
| `Button` | `ui/button` (`default`, `outline`, `ghost`, `secondary`, `link`) |
| `Field` + `Input` / `Select` | `ui/label` + `ui/input` (fechas nativas `type="date"`) / `ui/select` |
| `filter-chip` | `ui/toggle-group` (`type="single"`, activo en primario) |
| `input[type=range]` | `ui/slider` |
| `SurfaceCard` | `ui/card` |
| `Badge` | `ui/badge` |
| `NavItem` (pestañas) | `ui/tabs` |
| menú móvil propio | `ui/sheet` |
| Material Symbols | `@phosphor-icons/react` |

Siguen en uso `SectionHeader` y `useToast` (compartidos con el admin: no se
editan para la website).

Los componentes de shadcn se añaden **dentro del contenedor de desarrollo**
(`npx shadcn@latest add …`, ver `CLAUDE.md`). Estilo `radix-maia`
(redondeado); los colores salen de los tokens de §2.4.

**React Bits** (`src/components/bits/`, variante JS-TW, añadidos por el
registro de shadcn: `npx shadcn@latest add @react-bits/<Nombre>-JS-TW`). Al
añadir uno: moverlo a `bits/`, cambiar `motion/react` por `framer-motion`
(una sola librería), cambiar sus colores fijos por tokens y revisar lo de
abajo.

| Componente | Dónde | Notas |
|---|---|---|
| `Aurora` (WebGL, ogl) | fondo del hero | El **único** fondo WebGL. Colores por `leerToken`. Se pausa fuera de pantalla (añadido) |
| `SplitText` (GSAP) | titular del hero, "Mi cuenta" | Palabras que suben `0.45em`, sin blur |
| `RotatingText` | "en Chelem / Chuburná" | La etiqueta rueda (permitido: es un intercambio de texto) |
| `CountUp` | cifras del hero y de la cuenta | Cifras calculadas de los datos, no inventadas |
| `SpotlightCard` | "La experiencia Frida" | Luz del color de la flor de cada tarjeta; hover solo sombra |
| `StarBorder` | "Reservar", "Confirmar reserva" | Solo en LA acción destacada de la pantalla |
| `ClickSpark` (canvas) | solo el hero | Su lienzo mide lo que envuelve: envolver la página entera crearía un canvas de miles de px |
| `CurvedLoop` | marquesina bajo el hero | Decorativa, `aria-hidden` |
| `PulseHeart` | favorito en `RoomCard` | Envuelto en un `span` que corta el clic (la tarjeta entera abre el detalle) |
| `Stepper` | panel de reserva (Detalle) | Fechas → Huéspedes y extras → Confirmar, DENTRO de la misma Card. Adaptado: sin tarjeta propia, `type="button"`, textos en español. Su deslizamiento entre pasos es la excepción "asistente" de §1 |
| `Counter` | cifras de Mi cuenta, huéspedes | Pinta los 10 dígitos por columna: siempre con el valor en `sr-only` y el Counter `aria-hidden` |
| `SpringCheck` | extras y política (Detalle) | **`strike="none"` + `doneOpacity={1}`**: por defecto tacha y apaga el texto (semántica de "tarea hecha"), y un extra marcado se leería como quitado |
| `SquishSwitch` | "Solo ofertas" (Búsqueda) | |
| `HoldButton` | "Mantén para cancelar" (Mi cuenta) | Acción destructiva: mantener, no clic. Texto sobre `--destructive` con `--destructive-foreground` |
| `PeekRating` | "Califica tu estancia" (Historial) | Estrellas en `--primary`: el dorado sobre blanco no llega a 3:1 como gráfico |
| `BounceCards` | galería (Detalle) | Añadidos `cardSize`/`pushOffset` (el original va en px fijos) y `reducirMovimiento`. Su hover empuja las fotos de lado: excepción aceptada (es un gesto de explorar la galería, no una tarjeta) |

**`GlideSelect`** (React Bits) es el desplegable de la website, siempre a
través de `website/components/Selector.jsx` (tokens, 44 px de alto, menú al
ancho del campo). Adaptado: iconos Phosphor y la etiqueta cambia sin blur.

**Calendario animado** (`SelectorFechas`): el popover entra con resorte, el
mes nuevo entra desde el lado de la flecha y el día elegido "late"
(`@keyframes dia-late` en `site.css`); hover solo escala. Todo se apaga con
reducir movimiento.

**Admin (fase 1) y componentes de marca** (`src/components/marca/`):

| Componente | Qué es | Dónde |
|---|---|---|
| `BotonDestacado` | StarBorder (destellos) + GlareHover (reflejo al pasar) + resorte (crece al pasar, se aplasta al presionar) + ClickSpark (chispas doradas) | "Reservar", "Nueva habitación", "Nueva reserva", "Acceder al panel": UNA por pantalla |
| `Pista` / `GrupoPistas` | WarmTooltip con tokens; en grupo, tras la primera las vecinas abren al instante y el globo se desliza | toda etiqueta flotante. Si el hijo es un elemento de una fila flex, pasar `className="flex-1 h-full"` (WarmTooltip lo envuelve en un `span inline-flex`) |
| `TarjetaCifra` | SpotlightCard + icono en su flor + CountUp | cifras del panel |
| `ConfirmarDescarte` | AlertDialog de shadcn | "¿Descartar cambios?" (SectionPanel y guardia de AdminApp) |
| `BotonTema` | círculo de View Transition + icono que gira | website, login, admin |

En el panel: `RubberSegment` (navegación superior; si la página no está en la barra, pulgar transparente), `BellToggle` ("Avisos"), `HoldButton` ("Mantén para salir"), `JellyRadio` (filtros), `AnimatedList` (actividad y listas; adaptado con `renderItem` y tokens).

**Adaptaciones de React Bits a recordar:** `BellToggle` y `HoldButton` usaban `blur-0` para quitar el desenfoque de su etiqueta, clase que NO existe en Tailwind v4: la etiqueta se quedaba borrosa. Se retiró el blur (solo opacidad); al añadir componentes, buscar `blur-0`. La insignia de BellToggle queda recortada por su `clip-path`: se usa `badge={false}` y una insignia propia fuera del botón. `ClickSpark` solo dibuja con chispas vivas (el original pintaba 60 fps siempre); `AnimatedList` sin colores fijos; los overlays de `sheet` y `alert-dialog` de shadcn sin `backdrop-blur`. El registro de React Bits vuelve a instalar `motion` y `@hugeicons/react` en cada `add`: tras añadir un componente, cambiar sus imports a `framer-motion`/Phosphor y desinstalarlos.

**Cambio de tema sin parpadeo:** la foto nueva de la View Transition nace
oculta por CSS (`clip-path: circle(0)` en `::view-transition-new(root)`,
con el origen en `--tema-x/--tema-y`) y la animación termina con
`fill: 'forwards'`. Sin eso, entre que el navegador crea la foto y arranca la
animación se veía el tema nuevo completo un instante. Un clic durante una
transición se ignora.

**shadcn además:** `calendar` + `popover` en `website/components/SelectorFechas.jsx`
(rango llegada → salida, `locale={es}`, días pasados deshabilitados, 2 meses en
escritorio y 1 en el teléfono; nunca `<input type="date">`), y `sonner` para
los avisos de la website (`toast.success(...)`; adaptado a `ThemeContext`, no a
`next-themes`).

**Listas que cambian** (filtros, orden, paginación, borrar): `AnimatePresence
mode="popLayout"` y cada elemento con `{...animacionItem}` (`src/lib/animacionListas.js`).
Dos reglas que salieron de un bug real (scroll horizontal y filas "fantasma"
con clics rápidos en los filtros):
1. **El contenedor de la lista lleva `position: relative`.** popLayout saca a
   los que salen con `position: absolute` respecto al ancestro posicionado más
   cercano; sin ancla, salían hasta 577 px fuera de la pantalla.
2. **La salida es corta (120 ms) y sin resorte.** Con el resorte de entrada,
   las salidas se encadenaban y llegaban a amontonarse 17 filas encimadas.
Además, `main` de la website y del admin llevan `overflow-x: clip` (no
`hidden`: no rompe `sticky`) como red de seguridad.

**Cambio de tema:** `alternarTemaConCirculo()` (`src/lib/transicionTema.js`):
View Transitions API nativa, un círculo que crece desde el botón. Sin soporte
o con reducir movimiento, cambia al instante.

**Reducir movimiento.** `MotionConfig` solo frena a framer-motion. GSAP,
WebGL y canvas **no se enteran**: cada página lee `useTheme().reduceMotion` y,
si está activo, pinta el texto quieto, el degradado `.hero__fallback` en vez
de Aurora, sin chispas, marquesina quieta y la cifra final sin contar.
Todo componente nuevo de React Bits necesita esa rama.

**WebGL y canvas no entienden `var()`.** Se leen los tokens resueltos con
`leerToken('--flor-morado', '#7A32C0')` (`src/lib/tokens-css.js`). El hex del
segundo argumento es el único admitido: respaldo por si el token no existe.

**Logotipo:** `website/components/Wordmark.jsx` recrea el logo (corona de
flores en SVG + FRIDA en Chewy) con tokens; `tono="noche"` para el hero. No
usar el PNG: trae fondo blanco y "CABAÑAS" en negro.

### 14.x Gráficas del panel (`admin/components/Graficas.jsx`)

- **Una serie por gráfica, un color** (`--serie`): la magnitud la dice el
  largo o el alto, el título nombra la serie; sin leyenda. Nunca doble eje.
- **"Hoy"** se marca con `--flor-rojo` (igual que la línea de hoy de la Línea
  de tiempo) **y** con la etiqueta "Hoy" en el eje: nunca solo el color.
- Par serie/hoy validado con el `validate_palette.js` de la skill dataviz en
  claro (`#7A32C0` / `#F5333A`) y oscuro (`#A874EC` / `#F5333A` sobre
  `#1E1727`). En oscuro la serie NO es `--primary` (`#B98AF0` queda fuera de
  la banda de luminosidad para marcas). Si cambias un color, vuelve a validar.
- Cada columna lleva `Pista` (WarmTooltip) al pasar el cursor o enfocar, con el
  valor en texto; las barras horizontales llevan etiqueta y valor directos.
  El texto va en tokens de texto, nunca en el color de la serie.
- Iconos de categoría con su flor = identidad, no estado. Los estados
  (pagado, cancelado) usan el par tintado + icono + texto.

