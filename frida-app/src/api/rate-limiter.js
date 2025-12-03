/**
 * Rate Limiter
 * - Previene ataques de fuerza bruta
 * - Limita solicitudes por endpoint
 * - Bloquea IPs/usuarios después de múltiples fallos
 */

import { RATE_LIMIT_CONFIG } from "./config";

export class RateLimiter {
  constructor() {
    // Estructura: { endpoint_method: { timestamps: [], failedAttempts: 0, blockedUntil: null } }
    this.requestHistory = {};
    
    // Bloqueos globales por endpoint
    this.blockedEndpoints = {};
    
    // Limpiar registros antiguos cada 5 minutos
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Verificar si se permite la solicitud
   */
  async checkLimit(endpoint, method = "GET") {
    const key = this.getKey(endpoint, method);
    const criticalConfig = RATE_LIMIT_CONFIG.CRITICAL_ENDPOINTS[endpoint];
    
    // Obtener configuración específica del endpoint o usar la general
    const maxRequests = criticalConfig?.max || RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW;
    const window = criticalConfig?.window || RATE_LIMIT_CONFIG.RATE_LIMIT_WINDOW;

    // Verificar si el endpoint está bloqueado
    if (this.blockedEndpoints[key]?.blockedUntil > Date.now()) {
      console.warn(`🚫 Endpoint bloqueado: ${endpoint} (${method})`);
      return false;
    }

    // Inicializar si no existe
    if (!this.requestHistory[key]) {
      this.requestHistory[key] = {
        timestamps: [],
        failedAttempts: 0,
        blockedUntil: null,
      };
    }

    const history = this.requestHistory[key];
    const now = Date.now();

    // Limpiar timestamps antiguos
    history.timestamps = history.timestamps.filter((ts) => now - ts < window);

    // Verificar límite de solicitudes
    if (history.timestamps.length >= maxRequests) {
      console.warn(`⚠️ Límite de tasa alcanzado para ${endpoint} (${method}): ${history.timestamps.length}/${maxRequests}`);
      history.failedAttempts += 1;

      // Bloquear después de múltiples intentos
      if (history.failedAttempts >= RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS) {
        history.blockedUntil = now + RATE_LIMIT_CONFIG.BLOCK_DURATION;
        console.error(`🛑 Endpoint bloqueado por ${RATE_LIMIT_CONFIG.BLOCK_DURATION / 1000}s: ${endpoint}`);
      }

      return false;
    }

    // Registrar timestamp de la solicitud
    history.timestamps.push(now);
    return true;
  }

  /**
   * Registrar éxito (reduce contador de fallos)
   */
  recordSuccess(endpoint, method = "GET") {
    const key = this.getKey(endpoint, method);
    if (this.requestHistory[key]) {
      this.requestHistory[key].failedAttempts = Math.max(0, this.requestHistory[key].failedAttempts - 1);
    }
  }

  /**
   * Registrar fallo
   */
  recordFailure(endpoint, method = "GET") {
    const key = this.getKey(endpoint, method);
    if (!this.requestHistory[key]) {
      this.requestHistory[key] = {
        timestamps: [],
        failedAttempts: 0,
        blockedUntil: null,
      };
    }
    
    this.requestHistory[key].failedAttempts += 1;

    // Bloquear si se alcanza el máximo de fallos
    if (this.requestHistory[key].failedAttempts >= RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS) {
      this.requestHistory[key].blockedUntil = Date.now() + RATE_LIMIT_CONFIG.BLOCK_DURATION;
      console.error(`🛑 Endpoint bloqueado por múltiples fallos: ${endpoint} (${method})`);
    }
  }

  /**
   * Generar clave única para endpoint+método
   */
  getKey(endpoint, method) {
    return `${method.toUpperCase()}:${endpoint}`;
  }

  /**
   * Limpiar registros antiguos
   */
  cleanup() {
    const now = Date.now();
    const window = RATE_LIMIT_CONFIG.RATE_LIMIT_WINDOW;

    for (const key in this.requestHistory) {
      const history = this.requestHistory[key];
      
      // Limpiar timestamps antiguos
      history.timestamps = history.timestamps.filter((ts) => now - ts < window);

      // Eliminar bloques expirados
      if (history.blockedUntil && history.blockedUntil < now) {
        history.blockedUntil = null;
        history.failedAttempts = 0;
      }

      // Eliminar entrada si está vacía
      if (history.timestamps.length === 0 && history.failedAttempts === 0 && !history.blockedUntil) {
        delete this.requestHistory[key];
      }
    }
  }

  /**
   * Obtener estadísticas para debugging
   */
  getStats() {
    return {
      requestHistory: this.requestHistory,
      blockedEndpoints: this.blockedEndpoints,
      totalKeys: Object.keys(this.requestHistory).length,
    };
  }

  /**
   * Destructor
   */
  destroy() {
    clearInterval(this.cleanupInterval);
  }
}
