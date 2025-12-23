// src/theme/AppThemeProvider.jsx
import { useEffect, useState } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import { loadAccessibilityPrefs } from "../utils/accessibilityDOM";

const AppThemeProvider = ({ children }) => {
  const [prefs, setPrefs] = useState(() => loadAccessibilityPrefs());

  useEffect(() => {
    const handler = (ev) => {
      if (ev?.detail) {
        setPrefs(ev.detail);
      } else {
        setPrefs(loadAccessibilityPrefs());
      }
    };
    window.addEventListener("hf:accessibilityChanged", handler);
    return () => window.removeEventListener("hf:accessibilityChanged", handler);
  }, []);

  const algorithm = prefs.darkMode
    ? antdTheme.darkAlgorithm
    : antdTheme.defaultAlgorithm;

  // 👇 Cuando reducedMotion = true, acortamos las animaciones de AntD
  const motionTokens = prefs.reducedMotion
    ? {
        motionDurationFast: "0s",
        motionDurationMid: "0s",
        motionDurationSlow: "0s",
        motionEaseInOut: "linear",
        motionEaseOut: "linear",
        motionEaseIn: "linear",
      }
    : {};

  return (
    <ConfigProvider
      theme={{
        algorithm,
        token: {
          borderRadius: 10,
          ...motionTokens,
        },
        wave: {
          // quita el efecto "wave" de los clicks si hay reducción de animaciones
          disabled: prefs.reducedMotion,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

export default AppThemeProvider;
