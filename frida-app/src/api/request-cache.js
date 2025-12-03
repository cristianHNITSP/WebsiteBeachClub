/**
 * Sistema de caché para solicitudes GET
 * - Reduce solicitudes al servidor
 * - Mejora rendimiento
 * - Válido por TTL configurable
 */

import { CACHE_CONFIG } from "./config";

export class RequestCache {
  constructor() {
    // Estructura: { url_params_hash: { data, timestamp, ttl } }
    this.cache = {};
    
    // Limpiar caché expirado cada minuto
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Generar hash para clave de caché
   */
  generateKey(url, params = {}) {
    const paramsStr = JSON.stringify(params);
    return `${url}::${paramsStr}`;
  }

  /**
   * Obtener del caché
   */
  get(url, params = {}) {
    if (!CACHE_CONFIG.ENABLED) return null;

    const key = this.generateKey(url, params);
    const entry = this.cache[key];

    if (!entry) return null;

    // Verificar si expiró
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      delete this.cache[key];
      return null;
    }

    console.log(`💾 Cache hit: ${url}`);
    return entry.data;
  }

  /**
   * Guardar en caché
   */
  set(url, params = {}, data) {
    if (!CACHE_CONFIG.ENABLED) return;

    const key = this.generateKey(url, params);
    
    // Obtener TTL específico del endpoint o usar el por defecto
    const ttl = CACHE_CONFIG.CACHEABLE_ENDPOINTS[url] || CACHE_CONFIG.DEFAULT_TTL;

    this.cache[key] = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    console.log(`💾 Caché guardado: ${url} (TTL: ${ttl / 1000}s)`);
  }

  /**
   * Limpiar entradas expiradas
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const key in this.cache) {
      const entry = this.cache[key];
      if (now - entry.timestamp > entry.ttl) {
        delete this.cache[key];
        cleaned += 1;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Caché limpiado: ${cleaned} entradas expiradas removidas`);
    }
  }

  /**
   * Invalidar caché de un endpoint
   */
  invalidate(url) {
    let invalidated = 0;
    for (const key in this.cache) {
      if (key.startsWith(url)) {
        delete this.cache[key];
        invalidated += 1;
      }
    }

    if (invalidated > 0) {
      console.log(`🔄 Caché invalidado: ${invalidated} entradas de ${url}`);
    }
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    return {
      totalEntries: Object.keys(this.cache).length,
      cache: this.cache,
    };
  }

  /**
   * Destructor
   */
  destroy() {
    clearInterval(this.cleanupInterval);
  }
}
