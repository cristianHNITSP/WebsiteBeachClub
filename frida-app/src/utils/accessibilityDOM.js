// src/utils/accessibilityDOM.js
const STORAGE_KEY = "hf:accessibility";

export const defaultAccessibilityPrefs = {
  reducedMotion: false,
  highContrast: false,
  largeFonts: false,
  darkMode: false,
};

export function loadAccessibilityPrefs() {
  if (typeof window === "undefined") return { ...defaultAccessibilityPrefs };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultAccessibilityPrefs };
    const parsed = JSON.parse(raw);
    return { ...defaultAccessibilityPrefs, ...parsed };
  } catch (e) {
    console.error("[accessibilityDOM] error leyendo prefs:", e);
    return { ...defaultAccessibilityPrefs };
  }
}

export function applyAccessibilityPrefs(prefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!root) return;

  const safe = { ...defaultAccessibilityPrefs, ...(prefs || {}) };

  root.dataset.reducedMotion = safe.reducedMotion ? "true" : "false";
  root.dataset.highContrast = safe.highContrast ? "true" : "false";
  root.dataset.largeFonts = safe.largeFonts ? "true" : "false";
  root.dataset.darkMode = safe.darkMode ? "true" : "false";
  root.dataset.theme = safe.darkMode ? "dark" : "light";
}

export function saveAccessibilityPrefs(prefs) {
  if (typeof window === "undefined") return;
  const merged = { ...defaultAccessibilityPrefs, ...(prefs || {}) };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.error("[accessibilityDOM] error guardando prefs:", e);
  }

  applyAccessibilityPrefs(merged);

  try {
    const ev = new CustomEvent("hf:accessibilityChanged", {
      detail: merged,
    });
    window.dispatchEvent(ev);
  } catch (e) {
    console.error("[accessibilityDOM] error lanzando evento:", e);
  }

  return merged;
}
