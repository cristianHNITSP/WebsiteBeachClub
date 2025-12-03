/**
 * Punto de entrada principal para toda la API
 * Exporta todos los módulos y utilidades
 */

// Configuración
export { API_CONFIG, RATE_LIMIT_CONFIG, CACHE_CONFIG } from "./config";

// Instancia de axios
export { default as axiosInstance } from "./axios-instance";

// Gestores
export { RateLimiter } from "./rate-limiter";
export { RequestCache } from "./request-cache";
export { WebSocketManager, wsManager } from "./websocket-manager";

// APIs específicas - Exportar como namespaces
export * as habitacionesAPI from "./habitaciones";
export * as reservasAPI from "./reservas";
export * as usuariosAPI from "./usuarios";

// Inicialización (opcional)
export const initializeAPI = () => {
  console.log("✅ API centralizada inicializada");
  console.log("📊 Rate limiting:", RATE_LIMIT_CONFIG);
  console.log("💾 Caché:", CACHE_CONFIG);
};
