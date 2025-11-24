// src/components/habitaciones/helpers.js
import { beachColors, neutrals } from "../../theme/beachTheme";

export const SEDES = [
  { label: "Casa Frida", value: "casa_frida" },
  { label: "Cabañas Frida", value: "cabanas_fridas" },
];

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

export const getCapacityLabel = (size) => {
  const found = CAPACITY_OPTIONS.find((o) => o.value === size);
  return found ? found.label : "-";
};

// 👉 ahora solo devolvemos meta, NO JSX
export const getEstadoMeta = (estado) => {
  switch (estado) {
    case "Activa":
      return {
        label: "Activa",
        color: beachColors.teal,
        textColor: "#064e3b",
      };
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
      return {
        label: "Bloqueada",
        color: "#9ca3af",
        textColor: "#111827",
      };
    default:
      return {
        label: estado || "-",
        color: "#e5e7eb",
        textColor: "#111827",
      };
  }
};

export const getSedeLabel = (hotelCode) => {
  const found = SEDES.find((s) => s.value === hotelCode);
  return found ? found.label : hotelCode || "-";
};

// 👉 igual, solo meta
export const getSedeMeta = (hotelCode) => {
  const label = getSedeLabel(hotelCode);
  const color =
    hotelCode === "casa_frida" ? beachColors.oceanBlue : beachColors.turquoise;

  return {
    label,
    color,
    textColor: "#0f172a",
  };
};

// Helper para saber si una habitación tiene promo válida
export const hasPromo = (hab) => {
  const discount = hab?.offer?.discountPercent;
  return hab?.offer?.isSpecial && typeof discount === "number" && discount > 0;
};

// re-export de temas para no estar importando desde theme en todos los componentes
export const neutralsTheme = neutrals;
export const beachTheme = beachColors;
