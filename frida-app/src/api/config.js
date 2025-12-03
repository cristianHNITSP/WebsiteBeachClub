/**
 * Configuración centralizada de la API
 * - Base URLs
 * - Timeouts
 * - Headers por defecto
 */

export const API_CONFIG = {
  // URLs base para cada servicio
  RESERVAS_SERVICE_URL: import.meta.env.VITE_RESERVAS_SERVICE_URL || "http://localhost:4002",
  USERS_SERVICE_URL: import.meta.env.VITE_USERS_SERVICE_URL || "http://localhost:4001",
  
  // WebSocket URLs
  RESERVAS_WS_URL: import.meta.env.VITE_RESERVAS_WS_URL || "http://localhost:4002",
  USERS_WS_URL: import.meta.env.VITE_USERS_WS_URL || "http://localhost:4001",

  // Configuración de timeouts
  REQUEST_TIMEOUT: 30000, // 30 segundos
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 segundo entre reintentos

  // Endpoints públicos (sin autenticación)
  PUBLIC_ENDPOINTS: [
    "/api/habitaciones/public",
    "/api/auth/login",
    "/api/auth/register",
  ],
};

// Configuración de rate limiting y throttling
export const RATE_LIMIT_CONFIG = {
  // Máximo de solicitudes por ventana de tiempo
  MAX_REQUESTS_PER_WINDOW: 100,
  
  // Ventana de tiempo en milisegundos
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minuto
  
  // Máximo de intentos fallidos antes de bloquear
  MAX_FAILED_ATTEMPTS: 5,
  
  // Tiempo de bloqueo en milisegundos
  BLOCK_DURATION: 15 * 60 * 1000, // 15 minutos
  
  // Endpoints críticos con límites más estrictos
  CRITICAL_ENDPOINTS: {
    "/api/auth/login": { max: 5, window: 5 * 60 * 1000 }, // 5 intentos cada 5 minutos
    "/api/auth/register": { max: 3, window: 1 * 60 * 1000 }, // 3 intentos cada minuto
    "/api/users": { max: 50, window: 60 * 1000 }, // 50 solicitudes cada minuto
  },
};

// Configuración de caché
export const CACHE_CONFIG = {
  ENABLED: true,
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutos
  
  // Endpoints que se cachean
  CACHEABLE_ENDPOINTS: {
    "/api/habitaciones/public": 10 * 60 * 1000, // 10 minutos
    "/api/users": 5 * 60 * 1000, // 5 minutos
  },
};
