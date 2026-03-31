// src/components/website/glassStyles.js
// ─────────────────────────────────────────────────────────────
// "Cabañas Frida" — Glassmorphism Design System
// Alineado con fridaTheme.js como fuente de verdad
// ─────────────────────────────────────────────────────────────

import {
  brand,
  neutrals,
  surfaces,
  status,
  dark,
  glass,
  glassSurface,
  glassCard,
  glassCardElevated,
  glassInput,
  adaptiveText,
} from "../../theme/fridaTheme";

// ── Design tokens (re-export para compatibilidad) ────────────
export const DS = {
  // Surfaces (light)
  surface: surfaces.bg,
  surfaceContainerLow: "#f0f4fa",
  surfaceContainerHighest: "#dfe3e9",
  surfaceContainerLowest: surfaces.card,

  // Core palette — mapped to new Frida colors
  primary: brand.primary,           // #7030A0 — Morado Frida
  primaryContainer: brand.accent,   // #D81B60 — Rosa Mexicano
  surfaceTint: brand.secondary,     // #FF8C00 — Naranja Caléndula (CTA)
  onPrimary: "#ffffff",

  secondary: brand.accent,          // #D81B60 — Rosa Mexicano
  tertiary: brand.secondary,        // #FF8C00 — Naranja
  gold: brand.secondary,            // #FF8C00 — reemplaza gold con secondary

  onSurface: neutrals.textPrimary,  // #2D2D2D
  outlineVariant: neutrals.border,  // #E0E0E0

  // Dark mode surfaces
  darkSurface: dark.bg,
  darkSurfaceContainer: dark.surface,
  darkSurfaceContainerHigh: dark.surfaceHigh,
  darkOnSurface: dark.textPrimary,
};

// ── Re-exports from fridaTheme ──────────────────────────────
export const vibrancy = {
  backdropFilter: glass.blur,
  WebkitBackdropFilter: glass.blur,
};

export { glassSurface, glassCard, glassInput, adaptiveText };

// ── Hero glass surface (over image) ─────────────────────────
export const heroGlass = () => ({
  background: "rgba(112,48,160,0.22)",
  backdropFilter: glass.blurLight,
  WebkitBackdropFilter: glass.blurLight,
  boxShadow: "none",
});

// ── Elevated card ────────────────────────────────────────────
export const elevatedCard = glassCardElevated;

// ── Section container ────────────────────────────────────────
export const sectionPadding = (isSm) => ({
  maxWidth: 1200,
  margin: "0 auto",
  padding: isSm ? "0 32px" : "0 20px",
});

// ── Section title underline accent ───────────────────────────
export const sectionTitleAccent = () => ({
  display: "inline-block",
  width: 40,
  height: 3,
  borderRadius: 2,
  background: brand.secondary,
  marginTop: 8,
  marginBottom: 20,
});

// ── Legacy COLORS (backward compatibility) ───────────────────
export const COLORS = {
  primary: brand.primary,       // #7030A0
  primaryDark: brand.primary,
  secondary: brand.accent,      // #D81B60
  rose: brand.accent,
  teal: status.success,         // #43A047
  orange: brand.secondary,      // #FF8C00
  amber: brand.secondary,
  green: status.success,
  deepBlue: brand.primary,
};

// ── Sucursales data ──────────────────────────────────────────
export const SUCURSALES = [
  {
    key: "chelem",
    name: "Cabañas Frida",
    subtitle: "Carretera Chelem",
    hotelCode: "cabanas_frida",
  },
  {
    key: "chuburna",
    name: "Casa Frida",
    subtitle: "Carretera Chuburná",
    hotelCode: "casa_frida",
  },
];

export function hotelCodeToKey(hotelCode) {
  return SUCURSALES.find((s) => s.hotelCode === hotelCode)?.key ?? null;
}

// ── Demo rooms (fallback when backend unavailable) ───────────
export const DEMO_ROOMS = [
  {
    key: "sr-01",
    title: "Suite Frente al Mar",
    desc: "Amplia, luminosa, ideal para descansar. Vista panorámica al océano y brisa marina constante.",
    rating: 4.8,
    reviews: 214,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBZ8gWXU0hkkpAIrmpp4uj6eI0NhIWTE8Z1hQVQs5CeEJKLHOFRUpfSkjWiZPxUH6z4WwHcP6FPUhIYOj5aOh-noyxhnn6S-ngrV_egd5r1unV_CgL8XCo5XHnaLPxCvD455HzC4SA59pyz5wPznqXOlDAJMFZh2IUXsf4tuBaCvaJ8QjyftB8FBRfwE0iEDSNvytCYxM-oc2_Y1iOxoi5D5ahO5I8nyL2LZdbNeQLScR0bO8MYu0Y_RHYwy3SBdQiuwNZF6YxFbCA",
    location: "chelem",
    price: 1850,
    amenities: ["wifi", "ac", "parking"],
    tag: "Top Deal",
    tagColor: brand.secondary,
    accent: brand.secondary,
  },
  {
    key: "sr-02",
    title: "Cabaña Familiar",
    desc: "Cómoda para 3-5 huéspedes. Perfecta para viajes en grupo con cocina equipada, área de hamacas y acceso a la piscina.",
    rating: 4.7,
    reviews: 168,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBykhq4UdCfEsmtvEAoPatnln79pHyKQd7pMLoSnugSsVZkedrSNqtyhRz6B6Z5Towi6wPaw7ncRj4-JR04Xn5xMLKeFddNwTFQJPaHZinm20k6jEmrtpEBJ2jtXLbLpJ8M7dcGjpiPuEv3VY817r6EVZz8UOZnH0fZUtOfV7unO9x4hB1_MnxToEALHi82xCuYbGysiaWVW_KwJjhaK4hFhLu2HzkxHtWrX7oB9t1gI2JIrC_9oH_e8PSokCsbuKPyoPqAar_Q_d4",
    location: "chuburna",
    price: 1500,
    amenities: ["wifi", "kitchen", "ac"],
    tag: "Familia",
    tagColor: brand.accent,
    accent: brand.accent,
  },
  {
    key: "sr-03",
    title: "Estancia Minimal",
    desc: "Simple, bonita y práctica. Excelente opción para escapadas cortas o viajeros de paso. Decoración moderna inspirada en lo local.",
    rating: 4.6,
    reviews: 141,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9E6SV1WLLNg5p1FSI7KAd5EjGTxeAENtIl67pc0o-IH3jGi3XNnyZVZeJsLv5HwUuV4rD7ZtyzGTPCJ4R4LWLy5MkgUX9BG1MUKh14qh92kowm1jB0nLDncmAmtdATDkq_88iKXwYx8hjXB9oLKVEqeimfWhR45JyaOPxEgmzM9kIBOCNZWrYEVL1uZAkKsG2ki_jaAepnHJNoDVpuP-WStW15e3jPSgy9c6BnRvJ8XxXfTVuZFgv__rEzcXBAMoTBcO3UVddvqc",
    location: "chuburna",
    price: 1200,
    amenities: ["wifi", "parking"],
    tag: "Best Deal",
    tagColor: status.error,
    accent: status.error,
  },
];
