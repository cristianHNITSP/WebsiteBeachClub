# API Centralizada - Documentación

## 📋 Descripción General

La carpeta `src/api/` contiene una solución centralizada para manejar todas las comunicaciones HTTP y WebSocket del frontend. Esto proporciona:

- ✅ **Validación de solicitudes**: Previene múltiples requests al recargar
- ✅ **Rate Limiting**: Protección contra ataques de fuerza bruta
- ✅ **Caché automático**: Mejora de rendimiento con TTL configurable
- ✅ **Interceptores globales**: Manejo uniforme de errores y tokens
- ✅ **WebSockets centralizados**: Gestión única de conexiones en tiempo real
- ✅ **Reintentos automáticos**: Para errores de red temporales

## 📁 Estructura de Archivos

```
src/api/
├── config.js                 # Configuración centralizada
├── axios-instance.js         # Cliente axios con interceptores
├── rate-limiter.js           # Sistema de rate limiting
├── request-cache.js          # Sistema de caché para GET
├── websocket-manager.js      # Gestor centralizado de WebSockets
├── habitaciones.js           # API de Habitaciones
├── reservas.js               # API de Reservas
├── usuarios.js               # API de Usuarios
├── index.js                  # Punto de entrada principal
└── README.md                 # Este archivo
```

## 🚀 Uso Rápido

### 1. Imports

```javascript
// Importar APIs específicas
import { habitacionesAPI, reservasAPI, usuariosAPI } from "../api";
import { wsManager } from "../api/websocket-manager";
```

### 2. Llamadas HTTP

#### Habitaciones
```javascript
// Obtener habitaciones públicas (con caché)
const data = await habitacionesAPI.fetchPublicHabitaciones(page, limit);

// Crear habitación
await habitacionesAPI.createHabitacion({ title, codigo, ... });

// Actualizar habitación
await habitacionesAPI.updateHabitacion(id, { title, ... });

// Eliminar habitación
await habitacionesAPI.deleteHabitacion(id, hard = false);

// Restaurar habitación
await habitacionesAPI.restoreHabitacion(id);
```

#### Reservas
```javascript
// Obtener reservas con filtros (con caché)
const data = await reservasAPI.fetchReservas({ 
  from, to, hotel, habitacion 
});

// Crear reserva
await reservasAPI.createReserva(payload);

// Check-in
await reservasAPI.checkInReserva(id);

// Check-out
await reservasAPI.checkOutReserva(id);

// Marcar como pagado
await reservasAPI.markReservaPaid(id);

// Marcar como no pagado
await reservasAPI.markReservaUnpaid(id);

// Enviar a papelera
await reservasAPI.trashReserva(id);

// Restaurar de papelera
await reservasAPI.restoreReserva(id);

// Actualizar fechas
await reservasAPI.updateReservaDateRange(id, startDate, endDate);
```

#### Usuarios
```javascript
// Login
const user = await usuariosAPI.loginUsuario(email, password);

// Logout
await usuariosAPI.logoutUsuario();

// Obtener usuarios (con caché)
const users = await usuariosAPI.fetchUsuarios({ 
  search, role, page, limit 
});

// Crear usuario
await usuariosAPI.createUsuario({ 
  name, email, role, password 
});

// Actualizar usuario
await usuariosAPI.updateUsuario(id, { name, email, role });

// Cambiar estado
await usuariosAPI.toggleUsuarioStatus(id, isActive);

// Eliminar usuario
await usuariosAPI.deleteUsuario(id);
```

### 3. WebSockets

```javascript
// Conectar a servicio
const socket = wsManager.connect("reservas");

// Escuchar evento
wsManager.on("reservas", "habitaciones:updated", (data) => {
  console.log("Habitación actualizada:", data);
});

// Emitir evento
wsManager.emit("reservas", "evento:name", { data });

// Desconectar
wsManager.disconnect("reservas");

// Verificar conexión
if (wsManager.isConnected("reservas")) {
  // conectado
}
```

## ⚙️ Configuración

### config.js

```javascript
export const API_CONFIG = {
  // Base URLs
  RESERVAS_SERVICE_URL: "http://localhost:4002",
  USERS_SERVICE_URL: "http://localhost:4001",
  
  // Timeouts y reintentos
  REQUEST_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

export const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS_PER_WINDOW: 100,
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minuto
  MAX_FAILED_ATTEMPTS: 5,
  BLOCK_DURATION: 15 * 60 * 1000, // 15 minutos
  
  CRITICAL_ENDPOINTS: {
    "/api/auth/login": { max: 5, window: 5 * 60 * 1000 },
    "/api/auth/register": { max: 3, window: 1 * 60 * 1000 },
  },
};

export const CACHE_CONFIG = {
  ENABLED: true,
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutos
  
  CACHEABLE_ENDPOINTS: {
    "/api/habitaciones/public": 10 * 60 * 1000,
    "/api/users": 5 * 60 * 1000,
  },
};
```

## 🛡️ Características de Seguridad

### 1. **Rate Limiting**
- Límite de 100 solicitudes por minuto (configurable)
- Endpoints críticos (login) con límites más estrictos
- Bloqueo automático después de 5 fallos durante 15 minutos
- Tracking por endpoint y método HTTP

### 2. **Prevención de Solicitudes Duplicadas**
- Detecta requests duplicadas mientras están en proceso
- Evita múltiples envíos al recargar la página
- Usa AbortController para cancelar requests

### 3. **Caché Inteligente**
- Solo cachea GET requests
- TTL configurable por endpoint
- Invalidación automática al hacer POST/PUT/PATCH/DELETE
- Limpieza de caché expirado cada minuto

### 4. **Reintentos Automáticos**
- Reintentos con backoff exponencial
- Solo para errores de red (503, 429, ECONNABORTED)
- Máximo 3 intentos

### 5. **Manejo de Tokens**
- Inyección automática de Bearer token
- Limpieza y logout al recibir 401
- Soporte para credenciales de cookies

## 📊 Debugging

### Verificar Rate Limiter
```javascript
import { RateLimiter } from "../api/rate-limiter";
const limiter = new RateLimiter();
console.log(limiter.getStats());
```

### Verificar Caché
```javascript
import { RequestCache } from "../api/request-cache";
const cache = new RequestCache();
console.log(cache.getStats());
```

### WebSocket Stats
```javascript
console.log(wsManager.getStats());
```

## 🔄 Flujo de Solicitud

```
Usuario hace request
    ↓
checkLimit() - ¿Rate limit OK?
    ↓
requestCache.get() - ¿Existe en caché?
    ↓
preventDuplicate() - ¿Ya está en proceso?
    ↓
addAuthToken() - Inyectar token
    ↓
ENVIAR REQUEST
    ↓
ERROR? → reintentar con backoff
    ↓
Cachear si es GET exitoso
    ↓
recordSuccess() - Decrementar fallos
    ↓
Retornar al usuario
```

## 🚨 Manejo de Errores

```javascript
try {
  await habitacionesAPI.fetchPublicHabitaciones(1, 5);
} catch (error) {
  if (error.code === "RATE_LIMIT_EXCEEDED") {
    console.log("Demasiadas solicitudes");
  } else if (error.code === "DUPLICATE_REQUEST") {
    console.log("Solicitud duplicada prevenida");
  } else if (error.response?.status === 401) {
    console.log("No autorizado");
  } else {
    console.log(error.message);
  }
}
```

## 📝 Migrando Código Antiguo

### Antes (sin API centralizada)
```javascript
import axios from "axios";

const res = await axios.get("/api/users", {
  params: { page: 1, limit: 10 }
});
const users = res.data;
```

### Después (con API centralizada)
```javascript
import { usuariosAPI } from "../api";

const users = await usuariosAPI.fetchUsuarios({ 
  page: 1, 
  limit: 10 
});
```

## ✨ Beneficios

| Característica | Antes | Después |
|---|---|---|
| **Rate Limiting** | ❌ No | ✅ Automático |
| **Caché** | ❌ Manual | ✅ Automático |
| **Duplicados** | ❌ Posibles | ✅ Prevenidos |
| **Reintentos** | ❌ Manual | ✅ Automático |
| **Token Management** | ❌ Manual | ✅ Automático |
| **Error Handling** | ❌ Repetido | ✅ Centralizado |
| **WebSockets** | ❌ Múltiples | ✅ Única conexión |

## 🔗 Referencias

- [Axios Documentation](https://axios-http.com/)
- [Socket.io Documentation](https://socket.io/)
- [Rate Limiting Patterns](https://en.wikipedia.org/wiki/Rate_limiting)

---

**Última actualización:** 2 de diciembre de 2025
**Versión:** 1.0.0
