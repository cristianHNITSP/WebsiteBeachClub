// src/components/habitaciones/helpers.js
import { beachColors, neutrals } from "../../theme/beachTheme";

/**
 * Normaliza el nombre de una sede a una clave interna segura.
 * Ej:
 * "Casa Frida" -> "casa_frida"
 * "Cabañas Frida" -> "cabanas_frida"
 * "cabanas-frida" -> "cabanas_frida"
 */
export const normalizeSedeKey = (name) => {
  return (
    String(name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "sede"
  );
};

// ✅ Alias para compatibilidad con datos viejos (NO es lista hardcodeada de sedes)
const SEDE_ALIASES = {
  cabanas_fridas: "cabanas_frida",
};

// ✅ Normaliza y aplica alias
export const normalizeHotelCode = (code) => {
  const k = normalizeSedeKey(code);
  return SEDE_ALIASES[k] || k || "sede";
};

/**
 * ✅ Catálogo dinámico (inyectado desde DB)
 * Espera objetos tipo: { key, name, isActive, color? }
 */
let SEDES_CATALOG = []; // <- ya NO usamos SEDES hardcodeadas

export const setSedesCatalog = (list) => {
  const arr = Array.isArray(list) ? list : [];
  SEDES_CATALOG = arr
    .map((s) => {
      const key = s?.key ? normalizeHotelCode(s.key) : normalizeSedeKey(s?.name);
      const name = String(s?.name || "").trim();
      const isActive = s?.isActive !== false;
      const color = typeof s?.color === "string" ? s.color.trim() : "";
      return { key, name, isActive, color };
    })
    .filter((x) => !!x.key);
};

const humanizeKey = (k) => {
  const s = String(k || "")
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
  if (!s) return "-";
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
};

const getSedeFromCatalog = (hotelCode, catalog = SEDES_CATALOG) => {
  const key = normalizeHotelCode(hotelCode);
  return (Array.isArray(catalog) ? catalog : []).find((s) => s.key === key) || null;
};

// 🎨 Paleta para sedes dinámicas (no hardcodea sedes, solo colores)
const SEDE_COLOR_POOL = [
  beachColors.oceanBlue,
  beachColors.turquoise,
  beachColors.teal,
  beachColors.sunset,
  beachColors.coral,
  "#a78bfa",
  "#60a5fa",
  "#34d399",
];

const hashStr = (str) => {
  const s = String(str || "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

export const getSedeLabel = (hotelCode, catalog) => {
  const key = normalizeHotelCode(hotelCode);
  const found = getSedeFromCatalog(key, catalog);
  if (found?.name) return found.name;
  return humanizeKey(key || hotelCode);
};

export const getSedeMeta = (hotelCode, catalog) => {
  const key = normalizeHotelCode(hotelCode);
  const found = getSedeFromCatalog(key, catalog);

  const label = found?.name ? found.name : humanizeKey(key || hotelCode);

  // Si la DB trae color lo respetamos; si no, lo asignamos estable por hash
  let color = "#e5e7eb";
  if (found?.color) {
    color = found.color;
  } else if (key) {
    const idx = hashStr(key) % SEDE_COLOR_POOL.length;
    color = SEDE_COLOR_POOL[idx] || "#e5e7eb";
  }

  return { label, color, textColor: "#0f172a", isActive: found?.isActive !== false };
};

// ✅ Mantengo export para compatibilidad: ya NO hay sedes hardcodeadas aquí
export const SEDES = []; // (deprecated) usa /api/sedes + setSedesCatalog()

export const CAPACITY_OPTIONS = [
  { label: "1 adulto", value: 1 },
  { label: "2 adultos", value: 2 },
  { label: "3 adultos", value: 3 },
  { label: "Familia", value: 4 },
];

export const tiposHabitacion = [
  "Suite",
  "Suite Jardín",
  "Cabaña",
  "Loft",
  "Doble",
  "King",
];

export const INVENTORY_STATES = [
  "Activa",
  "Mantenimiento",
  "Fuera de servicio",
  "Bloqueada",
];

export const PAPELERA_OPTIONS = [
  { label: "Activas (sin papelera)", value: "excluir" },
  { label: "Solo papelera", value: "solo" },
  { label: "Todas", value: "todas" },
];

export const getCapacityLabel = (size) => {
  const found = CAPACITY_OPTIONS.find((o) => o.value === size);
  return found ? found.label : "-";
};

export const isInventoryActive = (room) =>
  (room?.inventoryStatus || "Activa") === "Activa";

export const isTrashed = (room) => room?.isDeleted === true;

export const getEstadoMeta = (estado) => {
  switch (estado) {
    case "Activa":
      return { label: "Activa", color: beachColors.teal, textColor: "#064e3b" };
    case "Mantenimiento":
      return {
        label: "Mantenimiento",
        color: beachColors.sunset,
        textColor: "#7c2d12",
      };
    case "Fuera de servicio":
      return {
        label: "Fuera de servicio",
        color: beachColors.coral,
        textColor: "#7f1d1d",
      };
    case "Bloqueada":
      return { label: "Bloqueada", color: "#9ca3af", textColor: "#111827" };
    default:
      return { label: estado || "-", color: "#e5e7eb", textColor: "#111827" };
  }
};

export const hasPromo = (hab) => {
  const discount = hab?.offer?.discountPercent;
  return hab?.offer?.isSpecial && typeof discount === "number" && discount > 0;
};

// ✅ meta simple (sin availability)
export const getReservaMeta = (room) => {
  if (isTrashed(room)) {
    return {
      code: "papelera",
      label: "En papelera",
      color: "#9ca3af",
      textColor: "#111827",
    };
  }

  const invOk = isInventoryActive(room);

  if (!invOk) {
    return {
      code: "no_disponible",
      label: "No disponible",
      color: "#9ca3af",
      textColor: "#111827",
      description: `Estado: ${room?.inventoryStatus || "—"}`,
    };
  }

  return {
    code: "disponible",
    label: "Disponible",
    color: beachColors.teal,
    textColor: "#064e3b",
    description: "Disponible para solicitar reserva o información.",
  };
};

export const neutralsTheme = neutrals;
export const beachTheme = beachColors;
