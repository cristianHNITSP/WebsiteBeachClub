/**
 * API de Usuarios
 * Métodos reutilizables para operaciones de usuarios
 */

import axiosInstance from "./axios-instance";
import { RequestCache } from "./request-cache";

const cache = new RequestCache();

const ENDPOINTS = {
  AUTH_LOGIN: "/api/auth/login",
  AUTH_LOGOUT: "/api/auth/logout",
  USUARIOS: "/api/users",
};

/**
 * Login
 */
export const loginUsuario = async (email, password) => {
  try {
    const response = await axiosInstance.post(ENDPOINTS.AUTH_LOGIN, {
      email,
      password,
    });
    
    // Guardar token si viene en la respuesta
    if (response.data?.token) {
      localStorage.setItem("authToken", response.data.token);
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Logout
 */
export const logoutUsuario = async () => {
  try {
    await axiosInstance.post(ENDPOINTS.AUTH_LOGOUT, {}, { withCredentials: true });
    localStorage.removeItem("authToken");
    cache.invalidate(ENDPOINTS.USUARIOS);
  } catch (error) {
    localStorage.removeItem("authToken");
    throw error;
  }
};

/**
 * Obtener lista de usuarios
 */
export const fetchUsuarios = async (params = {}) => {
  try {
    const response = await axiosInstance.get(ENDPOINTS.USUARIOS, { params });
    return response.data;
  } catch (error) {
    if (error.code === "CACHE_HIT") {
      return error.data;
    }
    throw error;
  }
};

/**
 * Obtener usuario por ID
 */
export const fetchUsuarioById = async (id) => {
  try {
    const response = await axiosInstance.get(`${ENDPOINTS.USUARIOS}/${id}`);
    return response.data;
  } catch (error) {
    if (error.code === "CACHE_HIT") {
      return error.data;
    }
    throw error;
  }
};

/**
 * Crear usuario
 */
export const createUsuario = async (data) => {
  try {
    const response = await axiosInstance.post(ENDPOINTS.USUARIOS, data);
    cache.invalidate(ENDPOINTS.USUARIOS);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualizar usuario
 */
export const updateUsuario = async (id, data) => {
  try {
    const response = await axiosInstance.put(
      `${ENDPOINTS.USUARIOS}/${id}`,
      data
    );
    cache.invalidate(ENDPOINTS.USUARIOS);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Cambiar estado de usuario
 */
export const toggleUsuarioStatus = async (id, isActive) => {
  try {
    const response = await axiosInstance.patch(
      `${ENDPOINTS.USUARIOS}/${id}/status`,
      { isActive }
    );
    cache.invalidate(ENDPOINTS.USUARIOS);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Cambiar contraseña
 */
export const changeUserPassword = async (id, currentPassword, newPassword) => {
  try {
    const response = await axiosInstance.patch(
      `${ENDPOINTS.USUARIOS}/${id}/password`,
      { currentPassword, newPassword }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Eliminar usuario
 */
export const deleteUsuario = async (id) => {
  try {
    const response = await axiosInstance.delete(
      `${ENDPOINTS.USUARIOS}/${id}`
    );
    cache.invalidate(ENDPOINTS.USUARIOS);
    return response.data;
  } catch (error) {
    throw error;
  }
};
