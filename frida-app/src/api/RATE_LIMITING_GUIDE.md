# Configuración de Rate Limiting - Guía de Ajuste

## 🎯 Configuraciones Recomendadas por Escenario

### 1. Desarrollo Local (Lenient)
```javascript
export const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS_PER_WINDOW: 1000,        // Muy permisivo
  RATE_LIMIT_WINDOW: 60 * 1000,
  MAX_FAILED_ATTEMPTS: 20,               // Muchos intentos permitidos
  BLOCK_DURATION: 5 * 60 * 1000,         // 5 minutos
  
  CRITICAL_ENDPOINTS: {
    "/api/auth/login": { max: 50, window: 5 * 60 * 1000 },
    "/api/auth/register": { max: 30, window: 1 * 60 * 1000 },
  },
};
```

### 2. Producción Estándar (Balanced)
```javascript
// ← Actual en config.js
export const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS_PER_WINDOW: 100,
  RATE_LIMIT_WINDOW: 60 * 1000,
  MAX_FAILED_ATTEMPTS: 5,
  BLOCK_DURATION: 15 * 60 * 1000,
  
  CRITICAL_ENDPOINTS: {
    "/api/auth/login": { max: 5, window: 5 * 60 * 1000 },
    "/api/auth/register": { max: 3, window: 1 * 60 * 1000 },
  },
};
```

### 3. Producción High-Security (Strict)
```javascript
export const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS_PER_WINDOW: 50,           // Muy restrictivo
  RATE_LIMIT_WINDOW: 60 * 1000,
  MAX_FAILED_ATTEMPTS: 3,                // Muy pocos intentos
  BLOCK_DURATION: 30 * 60 * 1000,        // 30 minutos
  
  CRITICAL_ENDPOINTS: {
    "/api/auth/login": { max: 3, window: 10 * 60 * 1000 },
    "/api/auth/register": { max: 1, window: 5 * 60 * 1000 },
  },
};
```

---

## 📊 Análisis de Límites

### Endpoint: Login
| Config | Límite | Ventana | Comportamiento |
|--------|--------|---------|----------------|
| Dev | 50/5min | 5 min | Usuario puede intentar 50 veces cada 5 min |
| Prod | 5/5min | 5 min | Usuario puede intentar 5 veces cada 5 min |
| High-Sec | 3/10min | 10 min | Usuario puede intentar 3 veces cada 10 min |

### Endpoint: General API
| Config | Límite | Ventana | Cálculo |
|--------|--------|---------|---------|
| Dev | 1000/min | 1 min | ~16 req/seg |
| Prod | 100/min | 1 min | ~1-2 req/seg |
| High-Sec | 50/min | 1 min | ~0.8 req/seg |

---

## 🔧 Cómo Cambiar Configuración

### Opción 1: Directamente en config.js (No Recomendado)
```javascript
// src/api/config.js
export const RATE_LIMIT_CONFIG = {
  // Tus nuevos valores aquí
};
```

### Opción 2: Variables de Entorno (Recomendado)
```javascript
// .env
VITE_RATE_LIMIT_MAX=100
VITE_RATE_LIMIT_WINDOW=60000
VITE_RATE_LIMIT_ATTEMPTS=5
VITE_RATE_LIMIT_BLOCK=900000
```

Luego en `config.js`:
```javascript
export const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS_PER_WINDOW: parseInt(import.meta.env.VITE_RATE_LIMIT_MAX) || 100,
  RATE_LIMIT_WINDOW: parseInt(import.meta.env.VITE_RATE_LIMIT_WINDOW) || 60000,
  MAX_FAILED_ATTEMPTS: parseInt(import.meta.env.VITE_RATE_LIMIT_ATTEMPTS) || 5,
  BLOCK_DURATION: parseInt(import.meta.env.VITE_RATE_LIMIT_BLOCK) || 900000,
  // ... resto
};
```

### Opción 3: Dinámicamente en Runtime
```javascript
import { RateLimiter } from "../api/rate-limiter";

class DynamicRateLimiter extends RateLimiter {
  setCustomLimit(endpoint, max, window) {
    // Implementar lógica custom
  }
}
```

---

## 🎪 Escenarios de Prueba

### Test 1: Verificar que se bloquea después de N intentos
```javascript
// En consola del navegador
const testEndpoint = "/api/auth/login";

for (let i = 0; i < 10; i++) {
  try {
    await usuariosAPI.loginUsuario("test@test.com", "wrong");
  } catch (e) {
    if (e.code === "RATE_LIMIT_EXCEEDED") {
      console.log(`✅ Bloqueado después de intento ${i + 1}`);
      break;
    }
  }
}
```

### Test 2: Verificar caché
```javascript
// Primera llamada: desde API
const data1 = await habitacionesAPI.fetchPublicHabitaciones(1, 5);

// Segunda llamada: desde caché (debe ser más rápida)
const data2 = await habitacionesAPI.fetchPublicHabitaciones(1, 5);

console.log(data1 === data2); // true
```

### Test 3: Verificar reintentos
```javascript
// Simular error de red (desconectar WiFi)
// El cliente debe reintentar automáticamente
// Reconectar WiFi antes de que se agoten los intentos
```

---

## 📈 Recomendaciones por Tipo de Usuario

### Usuarios Desktop
```javascript
{
  MAX_REQUESTS_PER_WINDOW: 150,  // Más requests por minuto
  RATE_LIMIT_WINDOW: 60 * 1000,
  MAX_FAILED_ATTEMPTS: 5,
}
```

### Usuarios Mobile
```javascript
{
  MAX_REQUESTS_PER_WINDOW: 80,   // Menos requests (batería/datos)
  RATE_LIMIT_WINDOW: 60 * 1000,
  MAX_FAILED_ATTEMPTS: 3,
}
```

### API Pública (SPA)
```javascript
{
  MAX_REQUESTS_PER_WINDOW: 200,  // Más permisivo
  RATE_LIMIT_WINDOW: 60 * 1000,
  MAX_FAILED_ATTEMPTS: 10,
}
```

---

## 🚨 Alertas y Monitoreo

### Monitorear Rate Limiting
```javascript
// En App.jsx o AppShell
import { RateLimiter } from "./api/rate-limiter";

useEffect(() => {
  const limiter = new RateLimiter();
  const checkStats = setInterval(() => {
    const stats = limiter.getStats();
    
    // Alertar si hay muchos bloqueos
    const blockedCount = Object.values(stats.requestHistory)
      .filter(h => h.blockedUntil && h.blockedUntil > Date.now()).length;
    
    if (blockedCount > 0) {
      console.warn(`⚠️ ${blockedCount} endpoints bloqueados`);
      // Enviar métrica a analytics
    }
  }, 5000);
  
  return () => clearInterval(checkStats);
}, []);
```

---

## 📋 Checklist de Configuración

- [ ] Revisar límites actuales en `src/api/config.js`
- [ ] Determinar escenario (Dev/Prod/High-Sec)
- [ ] Probar con usuarios reales
- [ ] Ajustar basado en métricas
- [ ] Documentar cambios realizados
- [ ] Comunicar límites al equipo backend
- [ ] Monitorear en producción
- [ ] Revisar cada mes

---

## 🔗 Referencias

- **Documentación de Rate Limiting**: `src/api/rate-limiter.js`
- **Configuración Global**: `src/api/config.js`
- **README API**: `src/api/README.md`
- **OWASP**: https://owasp.org/www-community/attacks/Brute_force_attack

---

**Última Actualización**: 2 de diciembre de 2025
**Versión**: 1.0.0

