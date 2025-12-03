import { useState, useEffect, useMemo } from "react";
import { habitacionesAPI } from "../api/habitaciones";
import { Card, Form, message, Modal, Table, Tag, Space, Button, Typography } from "antd";
import dayjs from "dayjs";
import { ReloadOutlined } from "@ant-design/icons";
import { hasPromo } from "../components/habitaciones/helpers";
import HabitacionesHeader from "../components/habitaciones/HabitacionesHeader";
import HabitacionesFilters from "../components/habitaciones/HabitacionesFilters";
import HabitacionesMetrics from "../components/habitaciones/HabitacionesMetrics";
import HabitacionesTable from "../components/habitaciones/HabitacionesTable";
import HabitacionFormModal from "../components/habitaciones/HabitacionFormModal";

const { Text } = Typography;

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
  const [filtroPapelera, setFiltroPapelera] = useState("excluir");

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
    papelera: filtroPapelera,
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

      const api = await habitacionesAPI.fetchHabitacionesList(buildQueryParams(page));
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
      offerDiscountPercent: typeof registro.offer?.discountPercent === "number" ? registro.offer.discountPercent : null,
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
            await habitacionesAPI.updateHabitacion(editando._id, payload);
            messageApi.open({ key: "saving-room", type: "success", content: "Habitación actualizada.", duration: 2 });
          } else {
            await habitacionesAPI.createHabitacion(payload);
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

  const restaurarHabitacion = async (id) => {
    if (!canManageRooms) return messageApi.warning("No tienes permisos para restaurar.");
    try {
      setDeletingRoomId(id);
      messageApi.open({ key: `restore-${id}`, type: "loading", content: "Restaurando...", duration: 0 });
      await habitacionesAPI.restoreHabitacion(id);
      messageApi.open({ key: `restore-${id}`, type: "success", content: "Restaurada.", duration: 2 });
      await fetchHabitaciones(pagination.current || 1);
    } catch (err) {
      console.error(err);
      messageApi.open({ key: `restore-${id}`, type: "error", content: err?.response?.data?.message || "No se pudo restaurar.", duration: 3 });
    } finally {
      setDeletingRoomId(null);
    }
  };

  const eliminarHabitacionPermanent = async (id) => {
    if (!canManageRooms) return messageApi.warning("No tienes permisos para eliminar permanentemente.");
    try {
      setDeletingRoomId(id);
      messageApi.open({ key: `permanent-${id}`, type: "loading", content: "Eliminando permanentemente...", duration: 0 });
      await habitacionesAPI.deleteHabitacion(id, true);
      messageApi.open({ key: `permanent-${id}`, type: "success", content: "Eliminada permanentemente.", duration: 2 });
      await fetchHabitaciones(pagination.current || 1);
    } catch (err) {
      console.error(err);
      messageApi.open({ key: `permanent-${id}`, type: "error", content: err?.response?.data?.message || "No se pudo eliminar permanentemente.", duration: 3 });
    } finally {
      setDeletingRoomId(null);
    }
  };

  const totalActivas = habitaciones.filter((h) => h.inventoryStatus === "Activa" && !h.isDeleted).length;
  const totalMantenimiento = habitaciones.filter((h) => h.inventoryStatus === "Mantenimiento" && !h.isDeleted).length;
  const totalFuera = habitaciones.filter((h) => (h.inventoryStatus === "Fuera de servicio" || h.inventoryStatus === "Bloqueada") && !h.isDeleted).length;
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

  /* ===================== ✅ MODAL: RESERVAS FUTURAS (paginado por índice) ===================== */
  const [reservasModal, setReservasModal] = useState({
    open: false,
    room: null,
    loading: false,
    items: [],
    page: 1,
    limit: 6,
    total: 0,
  });

  const loadReservasFuturas = async ({ roomId, page = 1 } = {}) => {
    const rid = roomId || reservasModal.room?._id;
    if (!rid) return;

    setReservasModal((p) => ({ ...p, loading: true, page }));
    try {
      const api = await habitacionesAPI.fetchHabitacionById(rid);
      const reservas = Array.isArray(api.reservas) ? api.reservas : [];
      setReservasModal((p) => ({
        ...p,
        loading: false,
        items: Array.isArray(api.items) ? api.items : [],
        total: typeof api.total === "number" ? api.total : (api.items || []).length,
        page: typeof api.page === "number" ? api.page : page,
      }));
    } catch (err) {
      console.error(err);
      setReservasModal((p) => ({ ...p, loading: false, items: [], total: 0 }));
      messageApi.error(err?.response?.data?.message || "No se pudieron cargar las reservas futuras de esta habitación.");
    }
  };

  const abrirReservasFuturas = (room) => {
    setReservasModal((p) => ({
      ...p,
      open: true,
      room,
      items: [],
      total: 0,
      page: 1,
      loading: true,
    }));
    loadReservasFuturas({ roomId: room?._id, page: 1 });
  };

  const cerrarReservasFuturas = () => {
    setReservasModal((p) => ({ ...p, open: false, room: null, items: [], total: 0, page: 1 }));
  };

  const reservasColumns = useMemo(
    () => [
      {
        title: "Fechas",
        key: "fechas",
        width: 220,
        render: (_, r) => {
          const s = r?.startDate ? dayjs(r.startDate).format("DD/MM/YYYY") : "—";
          const e = r?.endDate ? dayjs(r.endDate).format("DD/MM/YYYY") : s;
          return (
            <Space direction="vertical" size={0}>
              <Text style={{ fontSize: 12, fontWeight: 600 }}>{s} → {e}</Text>
              <Text style={{ fontSize: 10, color: "#6b7280" }}>
                Creada: {r?.createdAt ? dayjs(r.createdAt).format("DD/MM/YYYY HH:mm") : "—"}
              </Text>
            </Space>
          );
        },
      },
      {
        title: "Detalle",
        key: "detalle",
        render: (_, r) => (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 12, fontWeight: 600 }}>{r?.label || "Reserva"}</Text>
            <Text style={{ fontSize: 10, color: "#6b7280" }}>{r?.notes ? r.notes : "—"}</Text>
          </Space>
        ),
      },
      {
        title: "Estado",
        key: "estado",
        width: 210,
        render: (_, r) => {
          const tags = [];
          if (r?.checkinAt) tags.push(<Tag key="ci" color="green" style={{ borderRadius: 999 }}>Check-in</Tag>);
          if (r?.checkoutAt) tags.push(<Tag key="co" color="red" style={{ borderRadius: 999 }}>Check-out</Tag>);
          if (r?.paidAt) tags.push(<Tag key="paid" color="cyan" style={{ borderRadius: 999 }}>$ Pagada</Tag>);
          if (!tags.length) tags.push(<Tag key="res" color="blue" style={{ borderRadius: 999 }}>Reserva</Tag>);
          return <Space size={6} wrap>{tags}</Space>;
        },
      },
      {
        title: "Total",
        key: "total",
        align: "right",
        width: 130,
        render: (_, r) => {
          const t = Number(r?.billing?.total);
          if (!Number.isFinite(t) || t <= 0) return <Text style={{ color: "#6b7280" }}>—</Text>;
          return <Text style={{ fontWeight: 700 }}>${t.toLocaleString("es-MX")}</Text>;
        },
      },
    ],
    []
  );

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
          onViewFutureReservations={abrirReservasFuturas} // ✅ NEW
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

      {/* ✅ MODAL: Reservas futuras por habitación */}
      <Modal
        open={reservasModal.open}
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: 700 }}>
              Reservas futuras · Hab {reservasModal.room?.codigo || reservasModal.room?.roomNumber || "—"}
            </Text>
            <Text style={{ fontSize: 11, color: "#6b7280" }}>
              {reservasModal.room?.title || "—"} · {reservasModal.room?.hotelCode || ""}
            </Text>
          </div>
        }
        onCancel={cerrarReservasFuturas}
        footer={[
          <Button key="refresh" icon={<ReloadOutlined />} onClick={() => loadReservasFuturas({ page: reservasModal.page })} loading={reservasModal.loading}>
            Recargar
          </Button>,
          <Button key="close" type="primary" onClick={cerrarReservasFuturas}>
            Cerrar
          </Button>,
        ]}
        width={980}
        destroyOnClose
      >
        <div style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 11, color: "#6b7280" }}>
            Se carga por índice (página). Total: <b>{reservasModal.total}</b>
          </Text>
        </div>

        <Table
          size="small"
          rowKey={(r) => String(r?._id || r?.id || `${r?.startDate}-${r?.endDate}`)}
          columns={reservasColumns}
          dataSource={reservasModal.items}
          loading={reservasModal.loading}
          pagination={{
            current: reservasModal.page,
            pageSize: reservasModal.limit,
            total: reservasModal.total,
            showSizeChanger: false,
            onChange: (page) => loadReservasFuturas({ page }),
          }}
        />
      </Modal>
    </>
  );
};

export default GestionHabitacionesView;
