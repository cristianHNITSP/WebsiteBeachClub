// src/api/axios.js
import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE || "";

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
});

// ====== Single-flight GET (evita multi requests si spamean refresh) ======
const inflightGets = new Map();

/**
 * GET deduplicado: si ya hay un GET idéntico en vuelo, regresa la misma promesa.
 * Útil para "refresh" spameado o CheckSession.
 */
export function getOnce(url, config = {}) {
  const paramsKey = config?.params ? JSON.stringify(config.params) : "";
  const key = `GET:${url}?${paramsKey}`;

  if (inflightGets.has(key)) return inflightGets.get(key);

  const p = axiosInstance.get(url, config).finally(() => inflightGets.delete(key));

  inflightGets.set(key, p);
  return p;
}

// ====== Helpers de auth ======
const EXPIRED_CODES = new Set(["TOKEN_EXPIRED"]); // solo este debe mostrar "expiró"
const SIGNED_OUT_CODES = new Set(["NO_TOKEN", "INVALID_TOKEN"]); // logout/manual/sin sesión

export function getAuthReason(err) {
  const status = err?.response?.status;
  const code = String(err?.response?.data?.error || err?.response?.data?.code || "");

  if (status === 401 && EXPIRED_CODES.has(code)) return "expired";
  if (status === 401 && SIGNED_OUT_CODES.has(code)) return "signed_out";
  return null;
}

export function isSessionExpiredError(err) {
  return getAuthReason(err) === "expired";
}

export function isAuthRequiredError(err) {
  return getAuthReason(err) === "signed_out";
}

/**
 * Normaliza errores backend -> mensaje friendly para usuario final.
 * Devuelve: { type, title, description, toast, retryAfterSec }
 */
export function normalizeAuthError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data || {};
  const code = data?.error || data?.code;

  const reason = getAuthReason(err);

  // Sin respuesta (offline, CORS, server caído)
  if (!err?.response) {
    return {
      type: "error",
      title: "No pudimos conectar",
      description:
        "No se pudo contactar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
      toast: "No se pudo conectar con el servidor.",
    };
  }

  // Rate limit (backend)
  if (status === 429 || String(code) === "RATE_LIMIT") {
    const ra = Number(err?.response?.headers?.["retry-after"]);
    const retryAfterSec = Number.isFinite(ra) ? ra : undefined;

    return {
      type: "warning",
      title: "Demasiados intentos",
      description: retryAfterSec
        ? `Hiciste muchos intentos seguidos. Intenta de nuevo en ${retryAfterSec}s.`
        : "Hiciste muchos intentos seguidos. Espera un momento e inténtalo de nuevo.",
      toast: "Espera un momento e inténtalo de nuevo.",
      retryAfterSec,
    };
  }

  // Sesión expirada (solo TOKEN_EXPIRED)
  if (reason === "expired") {
    return {
      type: "warning",
      title: "Sesión expirada",
      description: "Tu sesión expiró. Inicia sesión nuevamente para continuar.",
      toast: "Tu sesión expiró. Vuelve a iniciar sesión.",
    };
  }

  // No autenticado / sesión cerrada (NO_TOKEN / INVALID_TOKEN)
  // Importante: esto NO es "expirada"
  if (reason === "signed_out") {
    return {
      type: "info",
      title: "Sesión no activa",
      description: "Tu sesión ya no está activa. Inicia sesión para continuar.",
      toast: "Inicia sesión para continuar.",
    };
  }

  // Casos típicos del login
  if (String(code) === "USER_INACTIVE") {
    return {
      type: "warning",
      title: "Acceso restringido",
      description:
        "Tu usuario está inactivo. Contacta al administrador para reactivar tu acceso.",
      toast: "Tu usuario está inactivo.",
    };
  }

  if (String(code) === "INVALID_CREDENTIALS") {
    return {
      type: "error",
      title: "Credenciales incorrectas",
      description:
        "Usuario o contraseña incorrectos. Verifica e inténtalo de nuevo.",
      toast: "Usuario o contraseña incorrectos.",
    };
  }

  if (String(code) === "VALIDATION_ERROR") {
    return {
      type: "error",
      title: "Datos inválidos",
      description: "Revisa el correo y la contraseña.",
      toast: "Revisa los datos del formulario.",
    };
  }

  // Errores 5xx
  if (status >= 500) {
    return {
      type: "error",
      title: "Servidor no disponible",
      description: "Ocurrió un problema en el servidor. Intenta más tarde.",
      toast: "Error del servidor. Intenta más tarde.",
    };
  }

  // Fallback seguro (NO mostrar texto crudo backend)
  return {
    type: "error",
    title: "No se pudo completar la acción",
    description: "Intenta nuevamente en unos momentos.",
    toast: "Ocurrió un error. Intenta de nuevo.",
  };
}

export default axiosInstance;
export { axiosInstance };
