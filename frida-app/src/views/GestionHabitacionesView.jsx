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
  const [filtroPapelera, setFiltroPapelera] = useState("excluir"); // ✅ nuevo

  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form] = Form.useForm();

  const [messageApi, contextHolder] = message.useMessage();
  const [deletingRoomId, setDeletingRoomId] = useState(null);

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
      messageApi.info("Estás en modo solo lectura: no puedes crear, editar ni eliminar habitaciones.");
    }
  }, [currentUser, canManageRooms, messageApi]);

  const buildQueryParams = (page) => ({
    page,
    limit: pagination.pageSize,
    q: busqueda || undefined,
    hotelCode: filtroSede,
    inventoryStatus: filtroEstado,
    promo: filtroPromo,
    favorites: filtroFavoritos,
    papelera: filtroPapelera, // ✅ nuevo
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
      const items = api.items || [];
      const total = typeof api.total === "number" ? api.total : items.length;
      const serverPage = typeof api.page === "number" ? api.page : page;

      setHabitaciones(items);
      setPagination((prev) => ({ ...prev, current: serverPage, total }));

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
        content: "No se pudieron cargar las habitaciones. Intenta de nuevo más tarde.",
        duration: 3,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabitaciones(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, filtroSede, filtroEstado, filtroPromo, filtroFavoritos, filtroPapelera]);

  const abrirCrear = () => {
    if (!canManageRooms) return messageApi.warning("No tienes permisos para crear habitaciones.");
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
    if (!canManageRooms) return messageApi.warning("No tienes permisos para editar habitaciones.");
    if (registro?.isDeleted) return messageApi.warning("Esta habitación está en papelera. Restaúrala para editar.");

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
        typeof registro.offer?.discountPercent === "number" ? registro.offer.discountPercent : null,
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
    if (!canManageRooms) return messageApi.warning("No tienes permisos para modificar habitaciones.");

    form
      .validateFields()
      .then(async (values) => {
        try {
          const { offerIsSpecial, offerDiscountPercent, offerDescription, ...baseValues } = values;

          let discount = offerIsSpecial ? Number(offerDiscountPercent) : null;
          let offer;

          if (!offerIsSpecial || !discount || discount <= 0 || discount >= 100) {
            offer = { isSpecial: false, description: "", discountPercent: null };
          } else {
            offer = { isSpecial: true, description: offerDescription || "", discountPercent: discount };
          }

          const payload = { ...baseValues, offer };

          messageApi.open({
            key: "saving-room",
            type: "loading",
            content: editando ? "Guardando cambios..." : "Creando nueva habitación...",
            duration: 0,
          });

          if (editando && editando._id) {
            await axios.put(`/api/habitaciones/${editando._id}`, payload, { withCredentials: true });
            messageApi.open({ key: "saving-room", type: "success", content: "Habitación actualizada.", duration: 2 });
          } else {
            await axios.post("/api/habitaciones", payload, { withCredentials: true });
            messageApi.open({ key: "saving-room", type: "success", content: "Habitación creada.", duration: 2 });
          }

          await fetchHabitaciones(pagination.current || 1);
          cerrarModal();
        } catch (err) {
          console.error(err);
          messageApi.open({
            key: "saving-room",
            type: "error",
            content:
              err?.response?.status === 401
                ? "No autorizado. Revisa tu sesión o permisos."
                : err?.response?.data?.message || "Error al guardar la habitación.",
            duration: 3,
          });
        }
      })
      .catch(() => {});
  };

  // ✅ Papelera (soft delete)
  const enviarAPapelera = async (id) => {
    if (!canManageRooms) return messageApi.warning("No tienes permisos para eliminar habitaciones.");

    try {
      setDeletingRoomId(id);
      messageApi.open({ key: `trash-${id}`, type: "loading", content: "Enviando a papelera...", duration: 0 });

      await axios.patch(`/api/habitaciones/${id}/trash`, {}, { withCredentials: true });

      messageApi.open({ key: `trash-${id}`, type: "success", content: "Enviada a papelera.", duration: 2 });
      await fetchHabitaciones(pagination.current || 1);
    } catch (err) {
      console.error(err);
      messageApi.open({
        key: `trash-${id}`,
        type: "error",
        content:
          err?.response?.status === 401
            ? "No autorizado. Revisa tu sesión o permisos."
            : err?.response?.data?.message || "No se pudo enviar a papelera.",
        duration: 3,
      });
    } finally {
      setDeletingRoomId(null);
    }
  };

  // ✅ Restore
  const restaurarHabitacion = async (id) => {
    if (!canManageRooms) return messageApi.warning("No tienes permisos para restaurar.");

    try {
      setDeletingRoomId(id);
      messageApi.open({ key: `restore-${id}`, type: "loading", content: "Restaurando...", duration: 0 });

      await axios.patch(`/api/habitaciones/${id}/restore`, {}, { withCredentials: true });

      messageApi.open({ key: `restore-${id}`, type: "success", content: "Restaurada.", duration: 2 });
      await fetchHabitaciones(pagination.current || 1);
    } catch (err) {
      console.error(err);
      messageApi.open({
        key: `restore-${id}`,
        type: "error",
        content: err?.response?.data?.message || "No se pudo restaurar.",
        duration: 3,
      });
    } finally {
      setDeletingRoomId(null);
    }
  };

  // ✅ Delete permanente
  const eliminarHabitacionPermanent = async (id) => {
    if (!canManageRooms) return messageApi.warning("No tienes permisos para eliminar permanentemente.");

    try {
      setDeletingRoomId(id);
      messageApi.open({ key: `permanent-${id}`, type: "loading", content: "Eliminando permanentemente...", duration: 0 });

      await axios.delete(`/api/habitaciones/${id}/permanent`, { withCredentials: true });

      messageApi.open({ key: `permanent-${id}`, type: "success", content: "Eliminada permanentemente.", duration: 2 });
      await fetchHabitaciones(pagination.current || 1);
    } catch (err) {
      console.error(err);
      messageApi.open({
        key: `permanent-${id}`,
        type: "error",
        content: err?.response?.data?.message || "No se pudo eliminar permanentemente.",
        duration: 3,
      });
    } finally {
      setDeletingRoomId(null);
    }
  };

  const totalActivas = habitaciones.filter((h) => h.inventoryStatus === "Activa" && !h.isDeleted).length;
  const totalMantenimiento = habitaciones.filter((h) => h.inventoryStatus === "Mantenimiento" && !h.isDeleted).length;
  const totalFuera = habitaciones.filter(
    (h) => (h.inventoryStatus === "Fuera de servicio" || h.inventoryStatus === "Bloqueada") && !h.isDeleted
  ).length;
  const totalConPromo = habitaciones.filter((h) => hasPromo(h) && !h.isDeleted).length;
  const totalConFavoritos = habitaciones.filter((h) => (h.favoritesCount || 0) > 0 && !h.isDeleted).length;

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroSede("todas");
    setFiltroEstado("todas");
    setFiltroPromo("todas");
    setFiltroFavoritos("todas");
    setFiltroPapelera("excluir");
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
          onRecargar={() => fetchHabitaciones(pagination.current || 1)}
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
          filtroPapelera={filtroPapelera}
          setFiltroPapelera={setFiltroPapelera}
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
          onTrash={enviarAPapelera}
          onRestore={restaurarHabitacion}
          onDeletePermanent={eliminarHabitacionPermanent}
          deletingRoomId={deletingRoomId}
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
