// src/hooks/useDarkMode.js
// Subscribes to the accessibility event system and returns current darkMode state.
import { useEffect, useState } from "react";
import { loadAccessibilityPrefs } from "../utils/accessibilityDOM";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => loadAccessibilityPrefs().darkMode);

  useEffect(() => {
    const handler = (ev) => {
      const prefs = ev?.detail ?? loadAccessibilityPrefs();
      setIsDark(!!prefs.darkMode);
    };
    window.addEventListener("hf:accessibilityChanged", handler);
    return () => window.removeEventListener("hf:accessibilityChanged", handler);
  }, []);

  return isDark;
}
