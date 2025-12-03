/**
 * Cliente Axios centralizado con:
 * - Interceptores de solicitud y respuesta
 * - Manejo de errores
 * - Reintentos automáticos
 * - Rate limiting
 * - Prevención de solicitudes duplicadas
 */

import axios from "axios";
import { API_CONFIG } from "./config";
import { RateLimiter } from "./rate-limiter";
import { RequestCache } from "./request-cache";

// Crear instancia base de axios
const axiosInstance = axios.create({
  timeout: API_CONFIG.REQUEST_TIMEOUT,
  withCredentials: true,
});

// Instancias de utilidades
const rateLimiter = new RateLimiter();
const requestCache = new RequestCache();

// 🔒 Map para rastrear solicitudes en vuelo (prevenir duplicados)
const pendingRequests = new Map();

/**
 * Generar clave única para una solicitud
 */
const generateRequestKey = (config) => {
  const { method, url, data, params } = config;
  return `${method}:${url}:${JSON.stringify(params || {})}:${JSON.stringify(data || {})}`;
};

/**
 * Interceptor de solicitud
 */
axiosInstance.interceptors.request.use(
  async (config) => {
    // 🚫 Validar rate limiting
    const rateLimitOk = await rateLimiter.checkLimit(config.url, config.method);
    if (!rateLimitOk) {
      const error = new Error("Demasiadas solicitudes. Intenta de nuevo más tarde.");
      error.code = "RATE_LIMIT_EXCEEDED";
      error.config = config;
      return Promise.reject(error);
    }

    // 📦 Intentar obtener del caché (solo para GET)
    if (config.method === "get") {
      const cached = requestCache.get(config.url, config.params);
      if (cached) {
        // Retornar una respuesta cacheada
        return Promise.reject({
          code: "CACHE_HIT",
          data: cached,
          config,
        });
      }
    }

    // 🔄 Prevenir solicitudes duplicadas
    const requestKey = generateRequestKey(config);
    if (pendingRequests.has(requestKey)) {
      console.warn(`⚠️ Solicitud duplicada prevenida: ${requestKey}`);
      return Promise.reject({
        code: "DUPLICATE_REQUEST",
        message: "Esta solicitud ya está en proceso.",
        config,
      });
    }

    // Marcar como en proceso
    pendingRequests.set(requestKey, true);

    // Agregar token si existe
    const token = localStorage.getItem("authToken");
    if (token && !API_CONFIG.PUBLIC_ENDPOINTS.includes(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers["X-Request-ID"] = generateUniqueId();

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor de respuesta
 */
axiosInstance.interceptors.response.use(
  (response) => {
    const requestKey = generateRequestKey(response.config);
    pendingRequests.delete(requestKey);

    // 💾 Cachear respuesta GET exitosa
    if (response.config.method === "get") {
      requestCache.set(response.config.url, response.config.params, response.data);
    }

    // ✅ Registrar éxito en rate limiter
    rateLimiter.recordSuccess(response.config.url, response.config.method);

    return response;
  },
  async (error) => {
    const config = error.config;
    const requestKey = generateRequestKey(config);

    // Manejar cache hit
    if (error.code === "CACHE_HIT") {
      return Promise.resolve({ data: error.data, config });
    }

    // Manejar solicitud duplicada
    if (error.code === "DUPLICATE_REQUEST") {
      return Promise.reject(error);
    }

    // Manejar rate limit
    if (error.code === "RATE_LIMIT_EXCEEDED") {
      console.error("🚫 Rate limit alcanzado:", error.message);
      return Promise.reject(error);
    }

    // Reintentos automáticos para errores de red
    if (!config._retryCount) {
      config._retryCount = 0;
    }

    if (
      config._retryCount < API_CONFIG.RETRY_ATTEMPTS &&
      (error.response?.status === 503 ||
        error.response?.status === 429 ||
        error.code === "ECONNABORTED" ||
        error.code === "ENOTFOUND")
    ) {
      config._retryCount += 1;
      console.warn(`🔄 Reintentando solicitud (${config._retryCount}/${API_CONFIG.RETRY_ATTEMPTS})...`);

      // Esperar antes de reintentar
      await new Promise((resolve) => setTimeout(resolve, API_CONFIG.RETRY_DELAY * config._retryCount));

      return axiosInstance(config);
    }

    // ❌ Registrar fallo en rate limiter
    rateLimiter.recordFailure(config.url, config.method);

    // Limpiar solicitud en proceso
    pendingRequests.delete(requestKey);

    // Manejo de errores específicos
    if (error.response?.status === 401) {
      // Token expirado - limpiar localStorage
      localStorage.removeItem("authToken");
      window.location.href = "/login";
    }

    if (error.response?.status === 403) {
      console.error("❌ Acceso denegado:", error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * Generar ID único para rastrear solicitudes
 */
function generateUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default axiosInstance;
