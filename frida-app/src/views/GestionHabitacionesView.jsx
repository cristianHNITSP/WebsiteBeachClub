// src/views/GestionHabitacionesView.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Card, Form, message } from "antd";
import { hasPromo } from "../components/habitaciones/helpers";
import HabitacionesHeader from "../components/habitaciones/HabitacionesHeader";
import HabitacionesFilters from "../components/habitaciones/HabitacionesFilters";
import HabitacionesMetrics from "../components/habitaciones/HabitacionesMetrics";
import HabitacionesTable from "../components/habitaciones/HabitacionesTable";
import HabitacionFormModal from "../components/habitaciones/HabitacionFormModal";

// 🔐 Importante: aseguramos que SIEMPRE se manden cookies (auth_token)
axios.defaults.withCredentials = true;

const GestionHabitacionesView = ({ isMobile, currentUser }) => {
  const [habitaciones, setHabitaciones] = useState([]);
  const [loading, setLoading] = useState(false);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });

  const [busqueda, setBusqueda] = useState("");
  const [filtroSede, setFiltroSede] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [filtroPromo, setFiltroPromo] = useState("todas");
  const [filtroFavoritos, setFiltroFavoritos] = useState("todas");
  const [filtroEstadoReserva, setFiltroEstadoReserva] = useState("todos");

  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form] = Form.useForm();

  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    console.log("currentUser en GestionHabitacionesView:", currentUser);
  }, [currentUser]);

  const canManageRooms = useMemo(
    () =>
      currentUser?.role === "administrador" ||
      currentUser?.role === "admin" ||
      currentUser?.isAdmin === true ||
      currentUser?.permissions?.includes?.("manage_rooms"),
    [currentUser]
  );

  useEffect(() => {
    if (currentUser && !canManageRooms) {
      messageApi.info(
        "Estás en modo solo lectura: no puedes crear, editar ni eliminar habitaciones."
      );
    }
  }, [currentUser, canManageRooms, messageApi]);

  const buildQueryParams = (page) => ({
    page,
    limit: pagination.pageSize,
    // mismos nombres que espera el backend (buildHabitacionesFilterFromQuery)
    q: busqueda || undefined,
    hotelCode: filtroSede, // el backend trata "todas" como sin filtro
    inventoryStatus: filtroEstado, // igual
    promo: filtroPromo,
    favorites: filtroFavoritos,
    estadoReserva: filtroEstadoReserva, // "todos" | "no_reservada" | "reservada" | "en_espera"
  });

  const fetchHabitaciones = async (page = 1) => {
    try {
      setLoading(true);
      messageApi.open({
        key: "loading-rooms",
        type: "loading",
        content: "Cargando habitaciones...",
        duration: 0,
      });

      const res = await axios.get("/api/habitaciones/gestor.admin", {
        withCredentials: true,
        params: buildQueryParams(page),
      });

      const api = res.data || {};
      const items = Array.isArray(api) ? api : api.items || [];
      const total = Array.isArray(api)
        ? api.length
        : typeof api.total === "number"
        ? api.total
        : items.length;
      const serverPage = Array.isArray(api)
        ? page
        : typeof api.page === "number"
        ? api.page
        : page;

      setHabitaciones(items);
      setPagination((prev) => ({
        ...prev,
        current: serverPage,
        total,
      }));

      messageApi.open({
        key: "loading-rooms",
        type: "success",
        content: "Habitaciones cargadas correctamente.",
        duration: 2,
      });
    } catch (err) {
      console.error(err);
      messageApi.open({
        key: "loading-rooms",
        type: "error",
        content:
          "No se pudieron cargar las habitaciones. Intenta de nuevo más tarde.",
        duration: 3,
      });
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial + recarga cuando cambian filtros
  useEffect(() => {
    fetchHabitaciones(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    busqueda,
    filtroSede,
    filtroEstado,
    filtroPromo,
    filtroFavoritos,
    filtroEstadoReserva,
  ]);

  const abrirCrear = () => {
    if (!canManageRooms) {
      messageApi.warning("No tienes permisos para crear habitaciones.");
      return;
    }
    setEditando(null);
    form.resetFields();
    form.setFieldsValue({
      offerIsSpecial: false,
      offerDiscountPercent: null,
      offerDescription: "",
    });
    setModalVisible(true);
  };

  const abrirEditar = (registro) => {
    if (!canManageRooms) {
      messageApi.warning("No tienes permisos para editar habitaciones.");
      return;
    }
    setEditando(registro);
    form.setFieldsValue({
      codigo: registro.codigo,
      roomNumber: registro.roomNumber,
      title: registro.title,
      location: registro.location,
      img: registro.img,
      hotelCode: registro.hotelCode,
      roomType: registro.roomType,
      size: registro.size,
      price: registro.price,
      inventoryStatus: registro.inventoryStatus,
      badge: registro.badge,
      featured: registro.featured,
      amenities: registro.amenities || [],
      offerIsSpecial: registro.offer?.isSpecial || false,
      offerDiscountPercent:
        typeof registro.offer?.discountPercent === "number"
          ? registro.offer.discountPercent
          : null,
      offerDescription: registro.offer?.description || "",
    });
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditando(null);
    form.resetFields();
  };

  const guardarHabitacion = () => {
    if (!canManageRooms) {
      messageApi.warning("No tienes permisos para modificar habitaciones.");
      return;
    }

    form
      .validateFields()
      .then(async (values) => {
        try {
          const {
            offerIsSpecial,
            offerDiscountPercent,
            offerDescription,
            ...baseValues
          } = values;

          let discount = offerIsSpecial ? Number(offerDiscountPercent) : null;

          let offer;
          if (
            !offerIsSpecial ||
            !discount ||
            discount <= 0 ||
            discount >= 100
          ) {
            offer = {
              isSpecial: false,
              description: "",
              discountPercent: null,
            };
          } else {
            offer = {
              isSpecial: true,
              description: offerDescription || "",
              discountPercent: discount,
            };
          }

          const payload = {
            ...baseValues,
            offer,
          };

          messageApi.open({
            key: "saving-room",
            type: "loading",
            content: editando
              ? "Guardando cambios..."
              : "Creando nueva habitación...",
            duration: 0,
          });

          if (editando && editando._id) {
            await axios.put(`/api/habitaciones/${editando._id}`, {
              ...editando,
              ...payload,
            });
            messageApi.open({
              key: "saving-room",
              type: "success",
              content: "Habitación actualizada correctamente.",
              duration: 2,
            });
          } else {
            await axios.post("/api/habitaciones", payload);
            messageApi.open({
              key: "saving-room",
              type: "success",
              content: "Habitación creada correctamente.",
              duration: 2,
            });
          }

          await fetchHabitaciones(pagination.current || 1);
          cerrarModal();
        } catch (err) {
          console.error(err);
          if (err?.response?.status === 401) {
            messageApi.open({
              key: "saving-room",
              type: "error",
              content:
                "No autorizado para modificar habitaciones. Revisa tu sesión o permisos.",
              duration: 3,
            });
          } else {
            messageApi.open({
              key: "saving-room",
              type: "error",
              content: "Error al guardar la habitación.",
              duration: 3,
            });
          }
        }
      })
      .catch(() => {});
  };

  const eliminarHabitacion = async (id) => {
    if (!canManageRooms) {
      messageApi.warning("No tienes permisos para eliminar habitaciones.");
      return;
    }

    try {
      messageApi.open({
        key: `deleting-room-${id}`,
        type: "loading",
        content: "Eliminando habitación...",
        duration: 0,
      });

      await axios.delete(`/api/habitaciones/${id}`, {
        withCredentials: true,
      });

      messageApi.open({
        key: `deleting-room-${id}`,
        type: "success",
        content: "Habitación eliminada del inventario.",
        duration: 2,
      });

      await fetchHabitaciones(pagination.current || 1);
    } catch (err) {
      console.error(err);
      messageApi.open({
        key: `deleting-room-${id}`,
        type: "error",
        content:
          err?.response?.status === 401
            ? "No autorizado para eliminar habitaciones. Revisa tu sesión o permisos."
            : "No se pudo eliminar la habitación.",
        duration: 3,
      });
    }
  };

  const cambiarEstadoDeReserva = async (id, nuevoEstado) => {
    if (!canManageRooms) {
      messageApi.warning(
        "No tienes permisos para cambiar el estado de reserva."
      );
      return;
    }

    // Actualización optimista
    setHabitaciones((prev) =>
      prev.map((h) =>
        h._id === id ? { ...h, estadoDeReserva: nuevoEstado } : h
      )
    );

    try {
      await axios.patch(`/api/habitaciones/${id}/estado-reserva`, {
        estadoDeReserva: nuevoEstado,
      });
      messageApi.success("Estado de reserva actualizado.");
    } catch (err) {
      console.error(err);
      messageApi.error("No se pudo actualizar el estado de reserva.");
      await fetchHabitaciones(pagination.current || 1);
    }
  };

  // métricas globales (sobre el dataset cargado en esta página)
  const totalActivas = habitaciones.filter(
    (h) => h.inventoryStatus === "Activa"
  ).length;
  const totalMantenimiento = habitaciones.filter(
    (h) => h.inventoryStatus === "Mantenimiento"
  ).length;
  const totalFuera = habitaciones.filter(
    (h) =>
      h.inventoryStatus === "Fuera de servicio" ||
      h.inventoryStatus === "Bloqueada"
  ).length;
  const totalConPromo = habitaciones.filter((h) => hasPromo(h)).length;
  const totalConFavoritos = habitaciones.filter(
    (h) => (h.favoritesCount || 0) > 0
  ).length;

  // 🔄 limpiar filtros rápidamente
  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroSede("todas");
    setFiltroEstado("todas");
    setFiltroPromo("todas");
    setFiltroFavoritos("todas");
    setFiltroEstadoReserva("todos");
  };

  return (
    <>
      {contextHolder}

      <Card
        bordered={false}
        style={{
          marginTop: 4,
          marginBottom: 10,
          borderRadius: 16,
          background: "#ffffff",
          boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
        }}
      >
        <HabitacionesHeader
          isMobile={isMobile}
          currentUser={currentUser}
          canManageRooms={canManageRooms}
          onNueva={abrirCrear}
          onRecargar={() =>
            fetchHabitaciones(pagination.current || 1)
          }
          loading={loading}
        />

        <HabitacionesFilters
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          filtroSede={filtroSede}
          setFiltroSede={setFiltroSede}
          filtroEstado={filtroEstado}
          setFiltroEstado={setFiltroEstado}
          filtroPromo={filtroPromo}
          setFiltroPromo={setFiltroPromo}
          filtroFavoritos={filtroFavoritos}
          setFiltroFavoritos={setFiltroFavoritos}
          filtroEstadoReserva={filtroEstadoReserva}
          setFiltroEstadoReserva={setFiltroEstadoReserva}
          onClearFilters={limpiarFiltros}
        />

        <HabitacionesMetrics
          totalActivas={totalActivas}
          totalMantenimiento={totalMantenimiento}
          totalFuera={totalFuera}
          totalConPromo={totalConPromo}
          totalConFavoritos={totalConFavoritos}
          loading={loading}
        />

        <HabitacionesTable
          loading={loading}
          habitaciones={habitaciones}
          pagination={pagination}
          onChangePage={fetchHabitaciones}
          canManageRooms={canManageRooms}
          onEdit={abrirEditar}
          onDelete={eliminarHabitacion}
          onChangeEstadoReserva={cambiarEstadoDeReserva}
        />
      </Card>

      <HabitacionFormModal
        visible={modalVisible}
        isMobile={isMobile}
        editando={editando}
        form={form}
        onCancel={cerrarModal}
        onOk={guardarHabitacion}
      />
    </>
  );
};

export default GestionHabitacionesView;
