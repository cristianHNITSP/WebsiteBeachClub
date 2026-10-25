import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// site.css PRIMERO: sus utilidades de Tailwind (sin capa) quedan antes que
// cualquier *.module.css, así que ante empate de especificidad gana el módulo.
import "./website/site.css";
import App from "./App.jsx";
import "./index.css";
import { activarEsqueletoImagenes } from "./lib/esqueletoImagenes";

activarEsqueletoImagenes(); // antes del primer render: ninguna <img> se escapa

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
