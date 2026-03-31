// src/theme/fridaTheme.js
// ─────────────────────────────────────────────────────────────
// Cabañas Frida — Sistema de Diseño Centralizado
// Glassmorphism + Nueva paleta de colores
// Fuente unica de verdad para toda la app
// ─────────────────────────────────────────────────────────────

// ── 1. Colores de Marca (Core) ──────────────────────────────
export const brand = {
  primary: "#7030A0",     // Morado Frida — Navbar, CTA, títulos
  secondary: "#FF8C00",   // Naranja Caléndula — Ofertas, "Reservar ahora"
  accent: "#D81B60",      // Rosa Mexicano — Íconos, favoritos, bordes decorativos
};

// ── 2. Neutros y Tipografía ─────────────────────────────────
export const neutrals = {
  textPrimary: "#2D2D2D",   // Gris casi negro — legibilidad máxima
  textSecondary: "#666666",  // Gris medio — descripciones, subtítulos
  border: "#E0E0E0",        // Bordes y líneas
};

// ── 3. Fondos (Superficies) ─────────────────────────────────
export const surfaces = {
  bg: "#F8F9FA",            // Fondo base app
  card: "#FFFFFF",          // Fondo tarjetas
  emphasis: "#F3E5F5",      // Lavanda pálido — secciones destacadas
};

// ── 4. Colores de Estado (Feedback) ─────────────────────────
export const status = {
  success: "#43A047",       // Verde Hoja — confirmación
  error: "#E53935",         // Rojo Coral — errores
  info: "#00ACC1",          // Azul Playa — avisos
  warning: "#FF8C00",       // Naranja — alertas (reutiliza secondary)
};

// ── 5. Dark Mode ────────────────────────────────────────────
export const dark = {
  bg: "#0d1117",
  surface: "#161b22",
  surfaceHigh: "#1f2937",
  surfaceHighest: "#2d3748",
  textPrimary: "#f1f5f9",
  textSecondary: "rgba(241,245,249,0.72)",
  textMuted: "rgba(148,163,184,0.80)",
  border: "rgba(255,255,255,0.08)",
};

// ── 6. Glassmorphism Utilities ──────────────────────────────
export const glass = {
  blur: "blur(20px) saturate(160%)",
  blurLight: "blur(12px) saturate(140%)",
  blurHeavy: "blur(28px) saturate(180%)",
};

export const glassSurface = (isDark) => ({
  backdropFilter: glass.blur,
  WebkitBackdropFilter: glass.blur,
  ...(isDark
    ? {
        background: "rgba(22,27,34,0.78)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.36), inset 0 0 0 1px rgba(255,255,255,0.05)",
      }
    : {
        background: "rgba(255,255,255,0.72)",
        boxShadow: "0 8px 32px rgba(112,48,160,0.08), inset 0 0 0 1px rgba(255,255,255,0.60)",
      }),
});

export const glassCard = (isDark) => ({
  backdropFilter: glass.blur,
  WebkitBackdropFilter: glass.blur,
  borderRadius: 16,
  border: isDark
    ? "1px solid rgba(255,255,255,0.06)"
    : "1px solid rgba(112,48,160,0.08)",
  ...(isDark
    ? {
        background: "rgba(31,41,55,0.82)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.32)",
      }
    : {
        background: "rgba(255,255,255,0.82)",
        boxShadow: "0 20px 40px rgba(112,48,160,0.06)",
      }),
});

export const glassCardElevated = (isDark) => ({
  backdropFilter: glass.blurHeavy,
  WebkitBackdropFilter: glass.blurHeavy,
  borderRadius: 18,
  border: isDark
    ? "1px solid rgba(255,255,255,0.08)"
    : "1px solid rgba(112,48,160,0.10)",
  ...(isDark
    ? {
        background: "rgba(31,41,55,0.90)",
        boxShadow: "0 28px 56px rgba(0,0,0,0.38)",
      }
    : {
        background: "rgba(255,255,255,0.90)",
        boxShadow: "0 28px 56px rgba(112,48,160,0.08)",
      }),
});

export const glassInput = (isDark) => ({
  borderRadius: 12,
  backdropFilter: glass.blurLight,
  WebkitBackdropFilter: glass.blurLight,
  ...(isDark
    ? {
        background: "rgba(31,41,55,0.60)",
        borderColor: "rgba(255,255,255,0.10)",
      }
    : {
        background: "rgba(255,255,255,0.60)",
        borderColor: "rgba(112,48,160,0.12)",
      }),
});

export const glassNavbar = (isDark) => ({
  backdropFilter: glass.blurHeavy,
  WebkitBackdropFilter: glass.blurHeavy,
  ...(isDark
    ? {
        background: "rgba(13,17,23,0.85)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.40), inset 0 -1px 0 rgba(255,255,255,0.05)",
      }
    : {
        background: "rgba(112,48,160,0.88)",
        boxShadow: "0 4px 24px rgba(112,48,160,0.20), inset 0 -1px 0 rgba(255,255,255,0.15)",
      }),
});

// ── 7. Adaptive Text Colors ─────────────────────────────────
export const adaptiveText = (isDark) => ({
  primary: isDark ? dark.textPrimary : neutrals.textPrimary,
  secondary: isDark ? dark.textSecondary : neutrals.textSecondary,
  muted: isDark ? dark.textMuted : "rgba(45,45,45,0.50)",
  inverse: "#ffffff",
  accent: isDark ? brand.secondary : brand.primary,
  brand: brand.primary,
});

// ── 8. Ant Design Theme Token (Light) ───────────────────────
export const antdLightTokens = {
  // Paleta principal
  colorPrimary: brand.primary,
  colorInfo: status.info,
  colorSuccess: status.success,
  colorWarning: status.warning,
  colorError: status.error,
  colorLink: brand.primary,

  // Tipografia
  fontFamily:
    '"Manrope", "Noto Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize: 14,

  // Bordes y radios — glassmorphism usa radios generosos
  borderRadius: 14,
  borderRadiusLG: 18,
  borderRadiusSM: 10,
  borderRadiusXS: 6,

  // Alturas de control
  controlHeight: 40,
  controlHeightLG: 48,
  controlHeightSM: 32,

  // Fondos
  colorBgContainer: "rgba(255,255,255,0.82)",
  colorBgElevated: "rgba(255,255,255,0.92)",
  colorBgLayout: surfaces.bg,
  colorBgSpotlight: "rgba(112,48,160,0.08)",

  // Texto
  colorText: neutrals.textPrimary,
  colorTextSecondary: neutrals.textSecondary,
  colorTextTertiary: "rgba(45,45,45,0.45)",
  colorTextQuaternary: "rgba(45,45,45,0.25)",

  // Bordes
  colorBorder: "rgba(112,48,160,0.12)",
  colorBorderSecondary: "rgba(112,48,160,0.06)",

  // Sombras
  boxShadow: "0 6px 24px rgba(112,48,160,0.08)",
  boxShadowSecondary: "0 2px 8px rgba(112,48,160,0.06)",

  // Movimiento
  motionDurationFast: "0.1s",
  motionDurationMid: "0.2s",
  motionDurationSlow: "0.3s",
};

// ── 9. Ant Design Theme Token (Dark) ────────────────────────
export const antdDarkTokens = {
  ...antdLightTokens,

  // Fondos
  colorBgContainer: "rgba(31,41,55,0.82)",
  colorBgElevated: "rgba(31,41,55,0.92)",
  colorBgLayout: dark.bg,
  colorBgSpotlight: "rgba(112,48,160,0.15)",

  // Texto
  colorText: dark.textPrimary,
  colorTextSecondary: "rgba(241,245,249,0.72)",
  colorTextTertiary: "rgba(241,245,249,0.45)",
  colorTextQuaternary: "rgba(241,245,249,0.25)",

  // Bordes
  colorBorder: "rgba(255,255,255,0.10)",
  colorBorderSecondary: "rgba(255,255,255,0.06)",

  // Sombras
  boxShadow: "0 6px 24px rgba(0,0,0,0.30)",
  boxShadowSecondary: "0 2px 8px rgba(0,0,0,0.20)",
};

// ── 10. Ant Design Component-Level Tokens ───────────────────
export const antdComponentTokens = (isDark) => ({
  Button: {
    primaryShadow: isDark
      ? "0 4px 16px rgba(112,48,160,0.40)"
      : "0 4px 16px rgba(112,48,160,0.25)",
    borderRadiusLG: 14,
    fontWeight: 700,
    defaultBg: isDark ? "rgba(31,41,55,0.60)" : "rgba(255,255,255,0.60)",
    defaultBorderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(112,48,160,0.12)",
    defaultColor: isDark ? dark.textPrimary : neutrals.textPrimary,
  },
  Card: {
    borderRadiusLG: 18,
    colorBgContainer: isDark ? "rgba(31,41,55,0.82)" : "rgba(255,255,255,0.82)",
    boxShadowTertiary: isDark
      ? "0 12px 32px rgba(0,0,0,0.30)"
      : "0 12px 32px rgba(112,48,160,0.06)",
  },
  Input: {
    borderRadius: 12,
    colorBgContainer: isDark ? "rgba(31,41,55,0.60)" : "rgba(255,255,255,0.60)",
    activeShadow: isDark
      ? "0 0 0 2px rgba(112,48,160,0.30)"
      : "0 0 0 2px rgba(112,48,160,0.12)",
    activeBorderColor: brand.primary,
    hoverBorderColor: brand.primary,
  },
  InputNumber: {
    borderRadius: 12,
    colorBgContainer: isDark ? "rgba(31,41,55,0.60)" : "rgba(255,255,255,0.60)",
    activeShadow: isDark
      ? "0 0 0 2px rgba(112,48,160,0.30)"
      : "0 0 0 2px rgba(112,48,160,0.12)",
    activeBorderColor: brand.primary,
    hoverBorderColor: brand.primary,
  },
  Select: {
    borderRadius: 12,
    colorBgContainer: isDark ? "rgba(31,41,55,0.60)" : "rgba(255,255,255,0.60)",
    colorBgElevated: isDark ? "rgba(31,41,55,0.92)" : "rgba(255,255,255,0.92)",
    optionSelectedBg: isDark ? "rgba(112,48,160,0.20)" : "rgba(112,48,160,0.08)",
    optionActiveBg: isDark ? "rgba(112,48,160,0.10)" : "rgba(112,48,160,0.04)",
    selectorBg: isDark ? "rgba(31,41,55,0.60)" : "rgba(255,255,255,0.60)",
  },
  DatePicker: {
    borderRadius: 12,
    colorBgContainer: isDark ? "rgba(31,41,55,0.60)" : "rgba(255,255,255,0.60)",
    colorBgElevated: isDark ? "rgba(31,41,55,0.95)" : "rgba(255,255,255,0.95)",
    activeShadow: isDark
      ? "0 0 0 2px rgba(112,48,160,0.30)"
      : "0 0 0 2px rgba(112,48,160,0.12)",
    cellHoverBg: isDark ? "rgba(112,48,160,0.15)" : "rgba(112,48,160,0.06)",
  },
  Table: {
    borderRadius: 14,
    colorBgContainer: "transparent",
    headerBg: isDark ? "rgba(112,48,160,0.12)" : "rgba(112,48,160,0.06)",
    headerColor: isDark ? dark.textPrimary : neutrals.textPrimary,
    headerSortActiveBg: isDark ? "rgba(112,48,160,0.18)" : "rgba(112,48,160,0.10)",
    headerSortHoverBg: isDark ? "rgba(112,48,160,0.15)" : "rgba(112,48,160,0.08)",
    rowHoverBg: isDark ? "rgba(112,48,160,0.10)" : "rgba(112,48,160,0.04)",
    rowSelectedBg: isDark ? "rgba(112,48,160,0.15)" : "rgba(112,48,160,0.08)",
    rowSelectedHoverBg: isDark ? "rgba(112,48,160,0.20)" : "rgba(112,48,160,0.10)",
    borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(112,48,160,0.06)",
    headerBorderRadius: 14,
    cellPaddingBlock: 12,
    cellPaddingInline: 16,
  },
  Tabs: {
    inkBarColor: isDark ? "#c090e0" : brand.primary,
    itemActiveColor: isDark ? "#c090e0" : brand.primary,
    itemSelectedColor: isDark ? "#c090e0" : brand.primary,
    itemHoverColor: brand.accent,
    itemColor: isDark ? "rgba(241,245,249,0.60)" : neutrals.textSecondary,
  },
  Modal: {
    borderRadiusLG: 20,
    contentBg: isDark ? "rgba(31,41,55,0.92)" : "rgba(255,255,255,0.92)",
    headerBg: "transparent",
    titleColor: isDark ? dark.textPrimary : neutrals.textPrimary,
  },
  Drawer: {
    borderRadiusLG: 20,
    colorBgElevated: isDark ? "rgba(31,41,55,0.95)" : "rgba(255,255,255,0.95)",
  },
  Dropdown: {
    borderRadiusLG: 14,
    colorBgElevated: isDark ? "rgba(31,41,55,0.92)" : "rgba(255,255,255,0.92)",
    controlItemBgHover: isDark ? "rgba(112,48,160,0.12)" : "rgba(112,48,160,0.06)",
    controlItemBgActive: isDark ? "rgba(112,48,160,0.20)" : "rgba(112,48,160,0.08)",
  },
  Menu: {
    itemSelectedBg: isDark
      ? "rgba(112,48,160,0.20)"
      : "rgba(112,48,160,0.08)",
    itemSelectedColor: isDark ? "#c090e0" : brand.primary,
    itemHoverBg: isDark ? "rgba(112,48,160,0.10)" : "rgba(112,48,160,0.04)",
    itemColor: isDark ? "rgba(241,245,249,0.70)" : neutrals.textPrimary,
    colorBgContainer: "transparent",
  },
  Slider: {
    trackBg: brand.primary,
    trackHoverBg: brand.accent,
    handleColor: brand.primary,
    handleActiveColor: brand.accent,
    railBg: isDark ? "rgba(255,255,255,0.10)" : "rgba(112,48,160,0.10)",
    railHoverBg: isDark ? "rgba(255,255,255,0.15)" : "rgba(112,48,160,0.15)",
  },
  Rate: {
    starColor: brand.secondary,
    starBg: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
  },
  Tag: {
    borderRadiusSM: 8,
    defaultBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(112,48,160,0.04)",
    defaultColor: isDark ? dark.textPrimary : neutrals.textPrimary,
  },
  Badge: {
    dotSize: 8,
    colorBgContainer: brand.accent,
  },
  Tooltip: {
    borderRadius: 10,
    colorBgSpotlight: isDark ? "rgba(241,245,249,0.90)" : "rgba(45,45,45,0.88)",
    colorTextLightSolid: isDark ? "#0d1117" : "#ffffff",
  },
  Collapse: {
    contentBg: "transparent",
    headerBg: isDark ? "rgba(31,41,55,0.50)" : "rgba(255,255,255,0.50)",
    colorBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(112,48,160,0.08)",
  },
  Notification: {
    borderRadiusLG: 16,
    colorBgElevated: isDark ? "rgba(31,41,55,0.92)" : "rgba(255,255,255,0.92)",
  },
  Message: {
    contentBg: isDark ? "rgba(31,41,55,0.92)" : "rgba(255,255,255,0.92)",
  },
  Popover: {
    borderRadiusLG: 14,
    colorBgElevated: isDark ? "rgba(31,41,55,0.92)" : "rgba(255,255,255,0.92)",
  },
  Alert: {
    borderRadiusLG: 14,
  },
  Pagination: {
    borderRadius: 10,
    itemActiveBg: brand.primary,
    itemBg: isDark ? "rgba(31,41,55,0.60)" : "rgba(255,255,255,0.60)",
  },
  Segmented: {
    borderRadius: 999,
    itemSelectedBg: isDark ? "rgba(31,41,55,0.90)" : surfaces.card,
    trackBg: isDark ? "rgba(31,41,55,0.70)" : "rgba(255,255,255,0.60)",
    itemSelectedColor: isDark ? dark.textPrimary : neutrals.textPrimary,
    itemColor: isDark ? "rgba(241,245,249,0.70)" : neutrals.textSecondary,
  },
  Switch: {
    colorPrimary: brand.primary,
    colorPrimaryHover: brand.accent,
  },
  Checkbox: {
    colorPrimary: brand.primary,
    colorPrimaryHover: brand.accent,
  },
  Radio: {
    colorPrimary: brand.primary,
    colorPrimaryHover: brand.accent,
  },
  Progress: {
    defaultColor: brand.primary,
  },
  Spin: {
    colorPrimary: brand.primary,
  },
  Upload: {
    colorFillAlter: isDark ? "rgba(31,41,55,0.50)" : "rgba(255,255,255,0.50)",
  },
  Calendar: {
    colorBgContainer: isDark ? "rgba(31,41,55,0.82)" : "rgba(255,255,255,0.82)",
    itemActiveBg: brand.primary,
  },
  Steps: {
    colorPrimary: brand.primary,
  },
  Divider: {
    colorSplit: isDark ? "rgba(255,255,255,0.06)" : "rgba(112,48,160,0.08)",
  },
  Typography: {
    colorText: isDark ? dark.textPrimary : neutrals.textPrimary,
    colorTextSecondary: isDark ? dark.textSecondary : neutrals.textSecondary,
  },
  Form: {
    labelColor: isDark ? dark.textPrimary : neutrals.textPrimary,
  },
  Descriptions: {
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(112,48,160,0.08)",
    labelBg: isDark ? "rgba(31,41,55,0.50)" : "rgba(112,48,160,0.04)",
  },
  Statistic: {
    titleColor: isDark ? "rgba(241,245,249,0.55)" : neutrals.textSecondary,
    contentColor: isDark ? dark.textPrimary : neutrals.textPrimary,
  },
});

// ── 11. Backward compatibility — beachColors & neutrals ─────
// Estos exports mantienen la compatibilidad con imports existentes
export const beachColors = {
  turquoise: brand.accent,
  oceanBlue: brand.primary,
  sand: surfaces.emphasis,
  coral: status.error,
  deepBlue: brand.primary,
  teal: status.success,
  sunset: brand.secondary,
};

// Re-export neutrals con la misma forma que beachTheme.js
export const legacyNeutrals = {
  bg: surfaces.bg,
  textMain: neutrals.textPrimary,
  textMuted: neutrals.textSecondary,
};

// ── 12. CSS Custom Properties (para inyectar via JS si se necesita)
export const cssVars = (isDark) => ({
  "--frida-primary": brand.primary,
  "--frida-secondary": brand.secondary,
  "--frida-accent": brand.accent,
  "--frida-text": isDark ? dark.textPrimary : neutrals.textPrimary,
  "--frida-text-secondary": isDark ? dark.textSecondary : neutrals.textSecondary,
  "--frida-border": isDark ? dark.border : neutrals.border,
  "--frida-bg": isDark ? dark.bg : surfaces.bg,
  "--frida-card": isDark ? dark.surface : surfaces.card,
  "--frida-emphasis": isDark ? dark.surfaceHigh : surfaces.emphasis,
  "--frida-success": status.success,
  "--frida-error": status.error,
  "--frida-info": status.info,
  "--frida-warning": status.warning,
});
