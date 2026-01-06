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

export const getSedeMeta = (hotelCode) => {
  const label = getSedeLabel(hotelCode);
  const color =
    hotelCode === "casa_frida"
      ? beachColors.oceanBlue
      : beachColors.turquoise;
  return { label, color, textColor: "#0f172a" };
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

/**
 * Normaliza el nombre de una sede a una clave interna segura.
 * Ej:
 * "Casa Frida" -> "casa_frida"
 * "Cabañas Frida" -> "cabanas_frida"
 */
export const normalizeSedeKey = (name) => {
  return (
    String(name || "")
      .toLowerCase()
      // elimina tildes/acentos
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // todo lo que no sea a-z0-9 -> "_"
      .replace(/[^a-z0-9]+/g, "_")
      // quita guiones bajos al inicio/fin
      .replace(/^_+|_+$/g, "") || "sede"
  );
};
