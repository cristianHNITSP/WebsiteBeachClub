/**
 * Gestor centralizado de WebSockets
 * - Conexión única reutilizable
 * - Reconexión automática
 * - Manejo de eventos centralizado
 * - Validación de mensaje
 */

import { io } from "socket.io-client";
import { API_CONFIG } from "./config";

export class WebSocketManager {
  constructor() {
    this.sockets = new Map(); // Múltiples conexiones por servicio
    this.eventListeners = new Map(); // Listeners registrados
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 1 segundo
  }

  /**
   * Conectar a un servicio WebSocket
   */
  connect(service = "reservas", options = {}) {
    // Retornar conexión existente
    if (this.sockets.has(service)) {
      const socket = this.sockets.get(service);
      if (socket.connected) {
        console.log(`✅ Socket ${service} ya conectado`);
        return socket;
      }
    }

    const wsUrl =
      service === "reservas"
        ? API_CONFIG.RESERVAS_WS_URL
        : service === "users"
        ? API_CONFIG.USERS_WS_URL
        : null;

    if (!wsUrl) {
      console.error(`❌ Servicio WebSocket desconocido: ${service}`);
      return null;
    }

    console.log(`🔌 Conectando a WebSocket ${service}...`);

    const socket = io(wsUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      withCredentials: true,
      ...options,
    });

    // Eventos de conexión
    socket.on("connect", () => {
      console.log(`✅ Conectado a ${service} WebSocket:`, socket.id);
      this.reconnectAttempts = 0;
    });

    socket.on("disconnect", (reason) => {
      console.warn(`🔌 Desconectado de ${service} WebSocket:`, reason);
    });

    socket.on("connect_error", (error) => {
      console.error(`❌ Error de conexión ${service}:`, error.message);
    });

    socket.on("reconnect_attempt", () => {
      this.reconnectAttempts += 1;
      console.log(`🔄 Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    });

    // Guardar conexión
    this.sockets.set(service, socket);

    return socket;
  }

  /**
   * Desconectar de un servicio
   */
  disconnect(service = "reservas") {
    const socket = this.sockets.get(service);
    if (socket) {
      socket.disconnect();
      this.sockets.delete(service);
      console.log(`🔌 Desconectado de ${service}`);
    }
  }

  /**
   * Desconectar de todos los servicios
   */
  disconnectAll() {
    for (const [service, socket] of this.sockets) {
      socket.disconnect();
      console.log(`🔌 Desconectado de ${service}`);
    }
    this.sockets.clear();
  }

  /**
   * Registrar escucha de evento
   */
  on(service = "reservas", event, callback) {
    const socket = this.sockets.get(service);
    if (!socket) {
      console.error(`❌ Socket ${service} no conectado`);
      return;
    }

    const listenerId = `${service}:${event}`;
    socket.on(event, (data) => {
      // Validar datos antes de ejecutar callback
      if (this.validateMessage(event, data)) {
        callback(data);
      } else {
        console.warn(`⚠️ Mensaje inválido en evento ${event}:`, data);
      }
    });

    this.eventListeners.set(listenerId, callback);
  }

  /**
   * Desregistrar escucha de evento
   */
  off(service = "reservas", event) {
    const socket = this.sockets.get(service);
    if (socket) {
      socket.off(event);
    }

    const listenerId = `${service}:${event}`;
    this.eventListeners.delete(listenerId);
  }

  /**
   * Emitir evento
   */
  emit(service = "reservas", event, data = {}) {
    const socket = this.sockets.get(service);
    if (!socket || !socket.connected) {
      console.error(`❌ Socket ${service} no conectado para emitir evento`);
      return;
    }

    // Validar que los datos sean serializables
    try {
      JSON.stringify(data);
      socket.emit(event, data);
      console.log(`📤 Evento emitido: ${service}:${event}`);
    } catch (e) {
      console.error(`❌ Error al emitir evento ${event}:`, e.message);
    }
  }

  /**
   * Validar estructura de mensaje
   */
  validateMessage(event, data) {
    // Validaciones específicas por evento
    const validators = {
      "habitaciones:created": (d) => d._id && d.title,
      "habitaciones:updated": (d) => d._id && d.title,
      "habitaciones:deleted": (d) => d._id || d.id,
      "reservas:created": (d) => d._id && d.usuario,
      "reservas:updated": (d) => d._id,
    };

    const validator = validators[event];
    if (validator) {
      return validator(data);
    }

    // Por defecto, aceptar si es un objeto
    return typeof data === "object" && data !== null;
  }

  /**
   * Obtener socket de un servicio
   */
  getSocket(service = "reservas") {
    return this.sockets.get(service);
  }

  /**
   * Verificar si está conectado
   */
  isConnected(service = "reservas") {
    const socket = this.sockets.get(service);
    return socket ? socket.connected : false;
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    const stats = {};
    for (const [service, socket] of this.sockets) {
      stats[service] = {
        connected: socket.connected,
        id: socket.id,
        listeners: Object.keys(socket._events || {}).length,
      };
    }
    return stats;
  }
}

// Instancia global única
export const wsManager = new WebSocketManager();
