import { useSyncExternalStore } from 'react'
import { CoffeeIcon, BowlSteamIcon, ForkKnifeIcon, FishIcon, IceCreamIcon, MartiniIcon } from '@phosphor-icons/react'

/*
 * Restaurante (DEMO, sin backend): menú, tickets y cálculos de estadística.
 * Un almacén compartido por Punto de venta, Tickets, Menú, Estadísticas y el
 * Tablero. Se guarda en localStorage; el historial de tickets se genera de
 * forma determinista (30 días hacia atrás desde HOY) la primera vez.
 * Precios con IVA incluido (como en la carta); el ticket desglosa el IVA.
 */

export const CATEGORIAS = [
  { value: 'desayunos', label: 'Desayunos',      flor: 'naranja',  Icono: CoffeeIcon },
  { value: 'entradas',  label: 'Entradas',       flor: 'hoja',     Icono: BowlSteamIcon },
  { value: 'fuertes',   label: 'Platos fuertes', flor: 'morado',   Icono: ForkKnifeIcon },
  { value: 'mariscos',  label: 'Mariscos',       flor: 'turquesa', Icono: FishIcon },
  { value: 'postres',   label: 'Postres',        flor: 'orquidea', Icono: IceCreamIcon },
  { value: 'bebidas',   label: 'Bebidas',        flor: 'dorado',   Icono: MartiniIcon },
]
export const categoria = v => CATEGORIAS.find(c => c.value === v) ?? CATEGORIAS[0]

const MENU_BASE = [
  ['Huevos motuleños', 'desayunos', 145, 'Tortilla, frijol, huevo, salsa, jamón, chícharo y plátano.'],
  ['Chilaquiles verdes', 'desayunos', 135, 'Con pollo, crema, queso fresco y cebolla.'],
  ['Molletes yucatecos', 'desayunos', 110, 'Con frijol colado, queso y pico de gallo.'],
  ['Hot cakes de la casa', 'desayunos', 120, 'Con miel de abeja melipona y fruta.'],
  ['Sopa de lima', 'entradas', 115, 'Caldo de pollo, lima, tortilla frita.'],
  ['Panuchos (3)', 'entradas', 125, 'De cochinita, con cebolla morada.'],
  ['Salbutes (3)', 'entradas', 120, 'De pollo, con lechuga, tomate y aguacate.'],
  ['Papadzules', 'entradas', 130, 'Rellenos de huevo, salsa de pepita y tomate.'],
  ['Guacamole con totopos', 'entradas', 110, 'Hecho al momento.'],
  ['Cochinita pibil', 'fuertes', 195, 'Con cebolla morada, habanero y tortillas.'],
  ['Poc chuc', 'fuertes', 210, 'Cerdo a la naranja agria, frijol y cebolla asada.'],
  ['Relleno negro', 'fuertes', 205, 'Pavo en recado negro con but de cerdo.'],
  ['Queso relleno', 'fuertes', 240, 'Queso de bola con picadillo y kol.'],
  ['Pollo pibil', 'fuertes', 185, 'En hoja de plátano, arroz y frijol.'],
  ['Tikin xic', 'mariscos', 320, 'Pescado entero en achiote, a la leña.'],
  ['Ceviche de pescado', 'mariscos', 195, 'Con naranja agria, pepino y cilantro.'],
  ['Aguachile de camarón', 'mariscos', 235, 'Verde, con habanero y pepino.'],
  ['Pulpo a las brasas', 'mariscos', 295, 'Con puré de camote y chimichurri.'],
  ['Tacos de pescado (3)', 'mariscos', 175, 'Capeados, con col y chipotle.'],
  ['Marquesita de queso', 'postres', 75, 'Con queso de bola y cajeta.'],
  ['Dulce de papaya', 'postres', 85, 'Con queso de bola.'],
  ['Caballeros pobres', 'postres', 90, 'Pan en almíbar de canela.'],
  ['Helado artesanal', 'postres', 80, 'Mamey, coco o maracuyá.'],
  ['Agua de chaya', 'bebidas', 55, 'Con piña y limón.'],
  ['Horchata', 'bebidas', 50, 'De arroz, con canela.'],
  ['Café de olla', 'bebidas', 45, 'Con piloncillo y canela.'],
  ['Limonada mineral', 'bebidas', 55, 'Natural o de pepino.'],
  ['Michelada', 'bebidas', 95, 'Con clamato y chamoy.'],
  ['Margarita de maracuyá', 'bebidas', 145, 'Tequila, maracuyá, sal de chile.'],
  ['Xtabentún', 'bebidas', 110, 'Licor de anís y miel.'],
]
export const MENU_INICIAL = MENU_BASE.map(([nombre, categoria, precio, descripcion], i) => ({
  id: `P${String(i + 1).padStart(2, '0')}`, nombre, categoria, precio, descripcion, disponible: true,
}))

export const MESAS = Array.from({ length: 12 }, (_, i) => `Mesa ${i + 1}`)
export const METODOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', habitacion: 'Cargo a habitación' }
export const TIPOS = { mesa: 'Mesa', habitacion: 'Habitación', llevar: 'Para llevar' }
const MESEROS = ['Lucía P.', 'Jorge U.', 'Mariana C.', 'Emilio C.', 'Renata E.']
const HABITACIONES_CARGO = ['Suite Coral Grande', 'Cabaña del Manglar', 'Villa Chuburná Sunset', 'Suite Frida Clásica', 'Cabaña Brisa Marina', 'Estudio Palapa Norte']

export const IVA = 0.16
export const totales = (items, propinaPct = 0) => {
  const total = items.reduce((t, it) => t + it.precio * it.cantidad, 0)
  const subtotal = total / (1 + IVA)
  const propina = Math.round(total * propinaPct)
  return { subtotal, iva: total - subtotal, propina, total: total + propina }
}

/* ── Historial determinista ── */
function azar(semilla) {
  let a = semilla
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const HORAS = [7, 8, 8, 9, 9, 10, 13, 13, 14, 14, 14, 15, 15, 16, 19, 19, 20, 20, 20, 21, 21, 22] // más peso a comidas
function generar(menu) {
  const r = azar(777)
  const pick = arr => arr[Math.floor(r() * arr.length)]
  const tickets = []
  const ahora = new Date()
  let folio = 1000
  for (let d = 29; d >= 0; d--) {
    const dia = new Date(ahora); dia.setDate(dia.getDate() - d)
    const finde = dia.getDay() === 0 || dia.getDay() === 6
    const n = 9 + Math.floor(r() * 8) + (finde ? 6 : 0)
    const lista = []
    for (let k = 0; k < n; k++) {
      const h = pick(HORAS)
      const fecha = new Date(dia); fecha.setHours(h, Math.floor(r() * 60), 0, 0)
      if (fecha > ahora) continue
      const cats = h < 12 ? ['desayunos', 'bebidas', 'bebidas'] : ['entradas', 'fuertes', 'fuertes', 'mariscos', 'postres', 'bebidas', 'bebidas']
      const items = []
      const lineas = 1 + Math.floor(r() * 4)
      for (let l = 0; l < lineas; l++) {
        const opciones = menu.filter(p => p.categoria === pick(cats))
        const pl = pick(opciones.length ? opciones : menu)
        const ya = items.find(i => i.platilloId === pl.id)
        if (ya) ya.cantidad += 1
        else items.push({ platilloId: pl.id, nombre: pl.nombre, precio: pl.precio, cantidad: 1 + (r() < 0.25 ? 1 : 0) })
      }
      const tipo = r() < 0.62 ? 'mesa' : r() < 0.7 ? 'habitacion' : 'llevar'
      const referencia = tipo === 'mesa' ? pick(MESAS) : tipo === 'habitacion' ? pick(HABITACIONES_CARGO) : 'Para llevar'
      const metodo = tipo === 'habitacion' ? 'habitacion' : r() < 0.58 ? 'tarjeta' : 'efectivo'
      const propinaPct = tipo === 'llevar' ? 0 : pick([0, 0.1, 0.1, 0.15])
      lista.push({ fecha, tipo, referencia, metodo, propinaPct, items, mesero: pick(MESEROS), estado: r() < 0.03 ? 'cancelado' : 'pagado' })
    }
    lista.sort((a, b) => a.fecha - b.fecha).forEach(t => {
      tickets.push({ ...t, id: `T-${++folio}`, fecha: t.fecha.toISOString(), ...totales(t.items, t.propinaPct) })
    })
  }
  return tickets
}

/* ── Almacén ── */
const CLAVE = 'frida-restaurante-v1'
const leer = () => {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE))
    if (g && Array.isArray(g.menu) && Array.isArray(g.tickets)) return g
  } catch { /* sin almacenamiento o dato corrupto */ }
  return { menu: MENU_INICIAL, tickets: generar(MENU_INICIAL) }
}
let estado = leer()
const oyentes = new Set()
const guardar = sig => {
  estado = sig
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)) } catch { /* sin almacenamiento */ }
  oyentes.forEach(o => o())
}
const suscribir = o => { oyentes.add(o); return () => oyentes.delete(o) }

export const accionesRestaurante = {
  /** Cobra la orden y devuelve el ticket creado. */
  cobrar: ({ items, tipo, referencia, metodo, propinaPct, mesero = 'Gerente General' }) => {
    const ultimo = estado.tickets.reduce((m, t) => Math.max(m, Number(t.id.slice(2))), 1000)
    const ticket = {
      id: `T-${ultimo + 1}`, fecha: new Date().toISOString(), tipo, referencia, metodo, propinaPct, mesero,
      items: items.map(({ platilloId, nombre, precio, cantidad }) => ({ platilloId, nombre, precio, cantidad })),
      estado: 'pagado', ...totales(items, propinaPct),
    }
    guardar({ ...estado, tickets: [...estado.tickets, ticket] })
    return ticket
  },
  cancelarTicket: id => guardar({ ...estado, tickets: estado.tickets.map(t => (t.id === id ? { ...t, estado: 'cancelado' } : t)) }),
  alternarDisponible: id => guardar({ ...estado, menu: estado.menu.map(p => (p.id === id ? { ...p, disponible: !p.disponible } : p)) }),
  agregarPlatillo: datos => {
    const n = estado.menu.reduce((m, p) => Math.max(m, Number(p.id.slice(1))), 0) + 1
    guardar({ ...estado, menu: [...estado.menu, { id: `P${String(n).padStart(2, '0')}`, disponible: true, ...datos }] })
  },
}

export function useRestaurante() {
  const e = useSyncExternalStore(suscribir, () => estado)
  return { menu: e.menu, tickets: e.tickets, ...accionesRestaurante }
}

/* ── Cálculos de estadística (sobre tickets pagados) ── */
const inicioDia = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export const pagados = tickets => tickets.filter(t => t.estado === 'pagado')

/** Tickets pagados de los últimos `n` días (hoy incluido), y los `n` anteriores para comparar. */
export function periodo(tickets, n) {
  const fin = inicioDia(); fin.setDate(fin.getDate() + 1)
  const ini = new Date(fin); ini.setDate(ini.getDate() - n)
  const iniPrev = new Date(ini); iniPrev.setDate(iniPrev.getDate() - n)
  const ok = pagados(tickets)
  return {
    actual: ok.filter(t => new Date(t.fecha) >= ini && new Date(t.fecha) < fin),
    anterior: ok.filter(t => new Date(t.fecha) >= iniPrev && new Date(t.fecha) < ini),
  }
}

export const resumen = lista => {
  const ventas = lista.reduce((s, t) => s + t.total, 0)
  const platillos = lista.reduce((s, t) => s + t.items.reduce((a, i) => a + i.cantidad, 0), 0)
  return { ventas, tickets: lista.length, promedio: lista.length ? ventas / lista.length : 0, platillos }
}

export function ventasPorDia(tickets, n) {
  const hoy = inicioDia()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy); d.setDate(d.getDate() - (n - 1 - i))
    const sig = new Date(d); sig.setDate(sig.getDate() + 1)
    const del = pagados(tickets).filter(t => new Date(t.fecha) >= d && new Date(t.fecha) < sig)
    return { fecha: d, ventas: del.reduce((s, t) => s + t.total, 0), tickets: del.length }
  })
}

export function platillosVendidos(lista, menu) {
  const mapa = new Map()
  for (const t of lista) for (const it of t.items) {
    const x = mapa.get(it.platilloId) ?? { id: it.platilloId, nombre: it.nombre, cantidad: 0, ingresos: 0 }
    x.cantidad += it.cantidad; x.ingresos += it.cantidad * it.precio
    mapa.set(it.platilloId, x)
  }
  return [...mapa.values()]
    .map(x => ({ ...x, categoria: menu.find(p => p.id === x.id)?.categoria }))
    .sort((a, b) => b.cantidad - a.cantidad)
}

export function porCategoria(lista, menu) {
  const vendidos = platillosVendidos(lista, menu)
  return CATEGORIAS.map(c => {
    const de = vendidos.filter(v => v.categoria === c.value)
    return { ...c, cantidad: de.reduce((s, v) => s + v.cantidad, 0), ingresos: de.reduce((s, v) => s + v.ingresos, 0) }
  }).sort((a, b) => b.ingresos - a.ingresos)
}

export function porHora(lista) {
  const horas = Array.from({ length: 17 }, (_, i) => ({ hora: 7 + i, tickets: 0, ventas: 0 })) // 7:00 a 23:00
  for (const t of lista) {
    const h = new Date(t.fecha).getHours()
    const x = horas.find(y => y.hora === h)
    if (x) { x.tickets += 1; x.ventas += t.total }
  }
  return horas
}

export function porMetodo(lista) {
  return Object.entries(METODOS).map(([value, label]) => {
    const de = lista.filter(t => t.metodo === value)
    return { value, label, tickets: de.length, ventas: de.reduce((s, t) => s + t.total, 0) }
  })
}

export const mxn = (n, dec = 0) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
export const variacion = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null)
