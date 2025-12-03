/**
 * API de Habitaciones
 * Métodos reutilizables para operaciones de habitaciones
 */

import axiosInstance from "./axios-instance";
import { RequestCache } from "./request-cache";

const cache = new RequestCache();

const ENDPOINTS = {
  PUBLIC_HABITACIONES: "/api/habitaciones/public",
  HABITACIONES: "/api/habitaciones",
  HABITACIONES_LIST: "/api/habitaciones/gestor.admin",
};

/**
 * Obtener habitaciones públicas con paginación
 */
export const fetchPublicHabitaciones = async (page = 1, limit = 5) => {
  try {
    const response = await axiosInstance.get(ENDPOINTS.PUBLIC_HABITACIONES, {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    // Si es error de caché, retornar datos en caché
    if (error.code === "CACHE_HIT") {
      return error.data;
    }
    throw error;
  }
};

/**
 * Obtener lista completa de habitaciones (administrador)
 */
export const fetchHabitacionesList = async (params = {}) => {
  try {
    const response = await axiosInstance.get(ENDPOINTS.HABITACIONES_LIST, {
      params,
    });
    return response.data;
  } catch (error) {
    if (error.code === "CACHE_HIT") {
      return error.data;
    }
    throw error;
  }
};

/**
 * Obtener habitación por ID
 */
export const fetchHabitacionById = async (id) => {
  try {
    const response = await axiosInstance.get(`${ENDPOINTS.HABITACIONES}/${id}`);
    return response.data;
  } catch (error) {
    if (error.code === "CACHE_HIT") {
      return error.data;
    }
    throw error;
  }
};

/**
 * Crear nueva habitación
 */
export const createHabitacion = async (data) => {
  try {
    const response = await axiosInstance.post(ENDPOINTS.HABITACIONES, data);
    // Invalidar caché de lista
    cache.invalidate(ENDPOINTS.HABITACIONES_LIST);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualizar habitación
 */
export const updateHabitacion = async (id, data) => {
  try {
    const response = await axiosInstance.put(`${ENDPOINTS.HABITACIONES}/${id}`, data);
    cache.invalidate(ENDPOINTS.HABITACIONES_LIST);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Eliminar habitación
 */
export const deleteHabitacion = async (id, hard = false) => {
  try {
    const response = await axiosInstance.delete(`${ENDPOINTS.HABITACIONES}/${id}`, {
      params: { hard },
    });
    cache.invalidate(ENDPOINTS.HABITACIONES_LIST);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Restaurar habitación eliminada
 */
export const restoreHabitacion = async (id) => {
  try {
    const response = await axiosInstance.patch(
      `${ENDPOINTS.HABITACIONES}/${id}/restore`
    );
    cache.invalidate(ENDPOINTS.HABITACIONES_LIST);
    return response.data;
  } catch (error) {
    throw error;
  }
};
