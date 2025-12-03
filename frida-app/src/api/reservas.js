/**
 * API de Reservas
 * Métodos reutilizables para operaciones de reservas
 */

import axiosInstance from "./axios-instance";
import { RequestCache } from "./request-cache";

const cache = new RequestCache();

const ENDPOINTS = {
  RESERVAS: "/api/reservas",
  RESERVAS_HABS: "/api/reservas/habitaciones",
  RESERVAS_DATE_CHANGES: "/api/reservas/date-changes",
  RESERVAS_TRASH: "/api/reservas/trash",
};

/**
 * Obtener reservas por habitaciones con filtros
 */
export const fetchReservasByHabitaciones = async (params = {}) => {
  try {
    const response = await axiosInstance.get(ENDPOINTS.RESERVAS_HABS, { params });
    return response.data;
  } catch (error) {
    if (error.code === "CACHE_HIT") {
      return error.data;
    }
    throw error;
  }
};

/**
 * Obtener reservas con filtros
 */
export const fetchReservas = async (params = {}) => {
  try {
    const response = await axiosInstance.get(ENDPOINTS.RESERVAS, { params });
    return response.data;
  } catch (error) {
    if (error.code === "CACHE_HIT") {
      return error.data;
    }
    throw error;
  }
};

/**
 * Obtener cambios de fechas de reservas
 */
export const fetchReservaDateChanges = async (params = {}) => {
  try {
    const response = await axiosInstance.get(ENDPOINTS.RESERVAS_DATE_CHANGES, { params });
    return response.data;
  } catch (error) {
    if (error.code === "CACHE_HIT") {
      return error.data;
    }
    throw error;
  }
};

/**
 * Obtener reservas en papelera
 */
export const fetchReservasTrash = async (params = {}) => {
  try {
    const response = await axiosInstance.get(ENDPOINTS.RESERVAS_TRASH, { params });
    return response.data;
  } catch (error) {
    if (error.code === "CACHE_HIT") {
      return error.data;
    }
    throw error;
  }
};

/**
 * Crear nueva reserva
 */
export const createReserva = async (data) => {
  try {
    const response = await axiosInstance.post(ENDPOINTS.RESERVAS, data);
    cache.invalidate(ENDPOINTS.RESERVAS);
    cache.invalidate(ENDPOINTS.RESERVAS_HABS);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualizar reserva
 */
export const updateReserva = async (id, data) => {
  try {
    const response = await axiosInstance.put(`${ENDPOINTS.RESERVAS}/${id}`, data);
    cache.invalidate(ENDPOINTS.RESERVAS);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Check-in
 */
export const checkInReserva = async (id) => {
  try {
    const response = await axiosInstance.patch(
      `${ENDPOINTS.RESERVAS}/${id}/checkin`
    );
    cache.invalidate(ENDPOINTS.RESERVAS);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Check-out
 */
export const checkOutReserva = async (id) => {
  try {
    const response = await axiosInstance.patch(
      `${ENDPOINTS.RESERVAS}/${id}/checkout`
    );
    cache.invalidate(ENDPOINTS.RESERVAS);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Marcar como pagado
 */
export const markReservaPaid = async (id) => {
  try {
    const response = await axiosInstance.patch(
      `${ENDPOINTS.RESERVAS}/${id}/paid`
    );
    cache.invalidate(ENDPOINTS.RESERVAS);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Marcar como no pagado
 */
export const markReservaUnpaid = async (id) => {
  try {
    const response = await axiosInstance.patch(
      `${ENDPOINTS.RESERVAS}/${id}/unpaid`
    );
    cache.invalidate(ENDPOINTS.RESERVAS);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Enviar a papelera
 */
export const trashReserva = async (id) => {
  try {
    const response = await axiosInstance.patch(
      `${ENDPOINTS.RESERVAS}/${id}/trash`
    );
    cache.invalidate(ENDPOINTS.RESERVAS);
    cache.invalidate(ENDPOINTS.RESERVAS_TRASH);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Restaurar de papelera
 */
export const restoreReserva = async (id) => {
  try {
    const response = await axiosInstance.patch(
      `${ENDPOINTS.RESERVAS}/${id}/restore`
    );
    cache.invalidate(ENDPOINTS.RESERVAS);
    cache.invalidate(ENDPOINTS.RESERVAS_TRASH);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Eliminar permanentemente
 */
export const deleteReservaHard = async (id) => {
  try {
    const response = await axiosInstance.delete(
      `${ENDPOINTS.RESERVAS}/${id}/hard`
    );
    cache.invalidate(ENDPOINTS.RESERVAS);
    cache.invalidate(ENDPOINTS.RESERVAS_TRASH);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualizar fechas de reserva
 */
export const updateReservaDateRange = async (id, startDate, endDate) => {
  try {
    const response = await axiosInstance.patch(
      `${ENDPOINTS.RESERVAS}/${id}/dates`,
      { startDate, endDate }
    );
    cache.invalidate(ENDPOINTS.RESERVAS);
    cache.invalidate(ENDPOINTS.RESERVAS_HABS);
    cache.invalidate(ENDPOINTS.RESERVAS_DATE_CHANGES);
    return response.data;
  } catch (error) {
    throw error;
  }
};
