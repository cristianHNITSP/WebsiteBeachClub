import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import RouterApp from "../src/router/Main";

import {
  loadAccessibilityPrefs,
  applyAccessibilityPrefs,
} from "./utils/accessibilityDOM";
import AppThemeProvider from "./theme/AppThemeProvider";

// 👉 Aplicar accesibilidad al DOM antes de montar (sin flash)
const initialAccessibility = loadAccessibilityPrefs();
applyAccessibilityPrefs(initialAccessibility);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppThemeProvider>
      <RouterApp />
    </AppThemeProvider>
  </StrictMode>
);
