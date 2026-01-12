// src/views/GestionHabitacionesView.jsx
import { useState, useEffect, useMemo } from "react";
import axios from "@api/axios";
import {
  Card,
  Form,
  message,
  Modal,
  Table,
  Tag,
  Space,
  Button,
  Typography,
  Input,
} from "antd";
import dayjs from "dayjs";
import { ReloadOutlined, PlusOutlined } from "@ant-design/icons";
import {
  hasPromo,
  normalizeSedeKey,
  getSedeMeta,
  setSedesCatalog,
} from "../components/habitaciones/helpers";
import HabitacionesHeader from "../components/habitaciones/HabitacionesHeader";
import HabitacionesFilters from "../components/habitaciones/HabitacionesFilters";
import HabitacionesMetrics from "../components/habitaciones/HabitacionesMetrics";
import HabitacionesTable from "../components/habitaciones/HabitacionesTable";
import HabitacionFormModal from "../components/habitaciones/HabitacionFormModal";

axios.defaults.withCredentials = true;

const { Text } = Typography;

const cleanUrl = (u) => String(u || "").trim();

const normalizeImages = (record) => {
  const arr = Array.isArray(record?.images)
    ? record.images.map(cleanUrl).filter(Boolean)
    : [];
  if (arr.length) return arr;
  const legacy = cleanUrl(record?.img);
  return legacy ? [legacy] : [];
};

const normalizeDeletedImages = (v) => {
  const arr = Array.isArray(v) ? v : [];
  return arr.map(cleanUrl).filter(Boolean);
};

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

  const [saving, setSaving] = useState(false);

  const [messageApi, contextHolder] = message.useMessage();
  const [deletingRoomId, setDeletingRoomId] = useState(null);

  // ✅ Sedes (DB)
  const [sedes, setSedes] = useState([]);
  const [sedesLoading, setSedesLoading] = useState(false);
  const [sedesModalOpen, setSedesModalOpen] = useState(false);
  const [creatingSede, setCreatingSede] = useState(false);
  const [sedeForm] = Form.useForm();

  // ✅ opciones dinámicas (sin hardcode)
  const [sedeOptions, setSedeOptions] = useState([]);

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

  // Construye las opciones de sede para Select, incluyendo disabled si está inactiva
  const syncSedeOptionsFromList = (list) => {
    if (Array.isArray(list) && list.length) {
      const opts = list.map((s) => ({
        value: s.key || normalizeSedeKey(s.name),
        label: s.name || s.key || "Sede",
        disabled: s.isActive === false,
      }));
      setSedeOptions(opts);
    } else {
      setSedeOptions([]); // ✅ sin hardcode
    }
  };

  const fetchSedes = async () => {
    try {
      setSedesLoading(true);
      const res = await axios.get("/api/sedes", { withCredentials: true });
      const data = Array.isArray(res.data) ? res.data : [];
      setSedes(data);

      // ✅ Inyecta catálogo global para helpers (labels/meta en toda la UI)
      setSedesCatalog(data);

      syncSedeOptionsFromList(data);
    } catch (err) {
      console.error(err);

      // ✅ sin hardcode, solo queda vacío (y la UI humaniza el hotelCode)
      setSedes([]);
      setSedesCatalog([]);
      setSedeOptions([]);

      messageApi.open({
        key: "sedes-load",
        type: "warning",
        content:
          "No se pudieron cargar las sedes desde el servidor. Se mostrarán las claves como texto.",
        duration: 3,
      });
    } finally {
      setSedesLoading(false);
    }
  };

  // ✅ Carga sedes para que labels/meta salgan desde DB (aunque sea read-only)
  useEffect(() => {
    if (currentUser) fetchSedes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

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
        content:
          "No se pudieron cargar las habitaciones. Intenta de nuevo más tarde.",
        duration: 3,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabitaciones(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    busqueda,
    filtroSede,
    filtroEstado,
    filtroPromo,
    filtroFavoritos,
    filtroPapelera,
  ]);

  const abrirCrear = () => {
    if (!canManageRooms)
      return messageApi.warning("No tienes permisos para crear habitaciones.");

    setEditando(null);
    form.resetFields();
    form.setFieldsValue({
      images: [],
      img: "",
      deletedImages: [],
      offerIsSpecial: false,
      offerDiscountPercent: null,
      offerDescription: "",
    });
    setModalVisible(true);
  };

  const abrirEditar = (registro) => {
    if (!canManageRooms)
      return messageApi.warning("No tienes permisos para editar habitaciones.");
    if (registro?.isDeleted)
      return messageApi.warning(
        "Esta habitación está en papelera. Restaúrala para editar."
      );

    const imgs = normalizeImages(registro);

    setEditando(registro);
    form.setFieldsValue({
      codigo: registro.codigo,
      roomNumber: registro.roomNumber,
      title: registro.title,
      location: registro.location,
      images: imgs,
      img: imgs[0] || "",
      deletedImages: [],
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
    setSaving(false);
    form.resetFields();
  };

  // helper para saber si una clave de sede está inactiva (según lista de sedes)
  const isSedeInactive = (sedeKey) => {
    if (!sedeKey || !Array.isArray(sedes) || !sedes.length) return false;
    const found = sedes.find(
      (s) => (s.key || normalizeSedeKey(s.name)) === sedeKey
    );
    return !!found && found.isActive === false;
  };

  const guardarHabitacion = () => {
    if (!canManageRooms)
      return messageApi.warning(
        "No tienes permisos para modificar habitaciones."
      );

    form
      .validateFields()
      .then(async (values) => {
        try {
          setSaving(true);

          const {
            offerIsSpecial,
            offerDiscountPercent,
            offerDescription,
            deletedImages,
            ...baseValues
          } = values;

          const selectedSedeKey = baseValues.hotelCode;

          if (isSedeInactive(selectedSedeKey)) {
            if (!editando) {
              messageApi.error(
                "No puedes crear habitaciones en una sede inactiva. Activa la sede o elige otra."
              );
              return;
            }
            if (editando && selectedSedeKey !== editando.hotelCode) {
              messageApi.error(
                "No puedes mover esta habitación a una sede inactiva. Activa la sede o elige otra."
              );
              return;
            }
          }

          let discount = offerIsSpecial ? Number(offerDiscountPercent) : null;
          let offer;

          if (!offerIsSpecial || !discount || discount <= 0 || discount >= 100) {
            offer = { isSpecial: false, description: "", discountPercent: null };
          } else {
            offer = {
              isSpecial: true,
              description: offerDescription || "",
              discountPercent: discount,
            };
          }

          const images = Array.isArray(baseValues.images)
            ? baseValues.images.map(cleanUrl).filter(Boolean)
            : [];

          const payload = {
            ...baseValues,
            images,
            img: images[0] || cleanUrl(baseValues.img) || "",
            offer,
            deletedImages: normalizeDeletedImages(deletedImages),
          };

          messageApi.open({
            key: "saving-room",
            type: "loading",
            content: editando ? "Guardando cambios..." : "Creando nueva habitación...",
            duration: 0,
          });

          if (editando && editando._id) {
            await axios.put(`/api/habitaciones/${editando._id}`, payload, {
              withCredentials: true,
            });
            messageApi.open({
              key: "saving-room",
              type: "success",
              content: "Habitación actualizada.",
              duration: 2,
            });
          } else {
            await axios.post("/api/habitaciones", payload, {
              withCredentials: true,
            });
            messageApi.open({
              key: "saving-room",
              type: "success",
              content: "Habitación creada.",
              duration: 2,
            });
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
        } finally {
          setSaving(false);
        }
      })
      .catch(() => {});
  };

  const enviarAPapelera = async (id) => {
    if (!canManageRooms)
      return messageApi.warning("No tienes permisos para eliminar habitaciones.");
    try {
      setDeletingRoomId(id);
      messageApi.open({
        key: `trash-${id}`,
        type: "loading",
        content: "Enviando a papelera...",
        duration: 0,
      });
      await axios.patch(`/api/habitaciones/${id}/trash`, {}, { withCredentials: true });
      messageApi.open({
        key: `trash-${id}`,
        type: "success",
        content: "Enviada a papelera.",
        duration: 2,
      });
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
      messageApi.open({
        key: `restore-${id}`,
        type: "loading",
        content: "Restaurando...",
        duration: 0,
      });
      await axios.patch(`/api/habitaciones/${id}/restore`, {}, { withCredentials: true });
      messageApi.open({
        key: `restore-${id}`,
        type: "success",
        content: "Restaurada.",
        duration: 2,
      });
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

  const eliminarHabitacionPermanent = async (id) => {
    if (!canManageRooms)
      return messageApi.warning("No tienes permisos para eliminar permanentemente.");
    try {
      setDeletingRoomId(id);
      messageApi.open({
        key: `permanent-${id}`,
        type: "loading",
        content: "Eliminando permanentemente...",
        duration: 0,
      });
      await axios.delete(`/api/habitaciones/${id}/permanent`, { withCredentials: true });
      messageApi.open({
        key: `permanent-${id}`,
        type: "success",
        content: "Eliminada permanentemente.",
        duration: 2,
      });
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

  const totalActivas = habitaciones.filter(
    (h) => h.inventoryStatus === "Activa" && !h.isDeleted
  ).length;
  const totalMantenimiento = habitaciones.filter(
    (h) => h.inventoryStatus === "Mantenimiento" && !h.isDeleted
  ).length;
  const totalFuera = habitaciones.filter(
    (h) =>
      (h.inventoryStatus === "Fuera de servicio" || h.inventoryStatus === "Bloqueada") &&
      !h.isDeleted
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

  /* ===================== MODAL: RESERVAS FUTURAS ===================== */
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
      const res = await axios.get(`/api/habitaciones/${rid}/reservas.futuras`, {
        withCredentials: true,
        params: { page, limit: reservasModal.limit },
      });

      const api = res.data || {};
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
      messageApi.error(
        err?.response?.data?.message ||
          "No se pudieron cargar las reservas futuras de esta habitación."
      );
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
    setReservasModal((p) => ({
      ...p,
      open: false,
      room: null,
      items: [],
      total: 0,
      page: 1,
    }));
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
              <Text style={{ fontSize: 12, fontWeight: 600 }}>
                {s} → {e}
              </Text>
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
          if (r?.checkinAt)
            tags.push(
              <Tag key="ci" color="green" style={{ borderRadius: 999 }}>
                Check-in
              </Tag>
            );
          if (r?.checkoutAt)
            tags.push(
              <Tag key="co" color="red" style={{ borderRadius: 999 }}>
                Check-out
              </Tag>
            );
          if (r?.paidAt)
            tags.push(
              <Tag key="paid" color="cyan" style={{ borderRadius: 999 }}>
                $ Pagada
              </Tag>
            );
          if (!tags.length)
            tags.push(
              <Tag key="res" color="blue" style={{ borderRadius: 999 }}>
                Reserva
              </Tag>
            );
          return (
            <Space size={6} wrap>
              {tags}
            </Space>
          );
        },
      },
      {
        title: "Total",
        key: "total",
        align: "right",
        width: 130,
        render: (_, r) => {
          const fromTotalAmount = Number(r?.totalAmount);
          const fromBilling = Number(r?.billing?.total);
          const t =
            Number.isFinite(fromTotalAmount) && fromTotalAmount > 0
              ? fromTotalAmount
              : fromBilling;

          if (!Number.isFinite(t) || t <= 0) return <Text style={{ color: "#6b7280" }}>—</Text>;

          return <Text style={{ fontWeight: 700 }}>${t.toLocaleString("es-MX")}</Text>;
        },
      },
    ],
    []
  );

  /* ===================== MODAL: GESTIÓN DE SEDES ===================== */

  const handleOpenSedes = () => {
    if (!canManageRooms)
      return messageApi.warning("No tienes permisos para gestionar sedes.");
    setSedesModalOpen(true);
    fetchSedes();
  };

  const handleCreateSede = () => {
    if (!canManageRooms) return messageApi.warning("No tienes permisos para crear sedes.");

    sedeForm
      .validateFields()
      .then(async (values) => {
        try {
          setCreatingSede(true);

          const name = String(values.name || "").trim();
          const key = normalizeSedeKey(name);

          await axios.post("/api/sedes", { key, name }, { withCredentials: true });

          messageApi.success("Sede creada correctamente.");
          sedeForm.resetFields();
          await fetchSedes();
        } catch (err) {
          console.error(err);
          if (err?.response?.status === 409) {
            messageApi.error("Ya existe una sede con ese nombre o clave.");
          } else {
            messageApi.error("No se pudo crear la sede. Intenta de nuevo.");
          }
        } finally {
          setCreatingSede(false);
        }
      })
      .catch(() => {});
  };

  const handleToggleSedeStatus = async (sede) => {
    if (!canManageRooms)
      return messageApi.warning("No tienes permisos para actualizar sedes.");

    try {
      setSedesLoading(true);
      await axios.patch(
        `/api/sedes/${sede._id}/status`,
        { isActive: !sede.isActive },
        { withCredentials: true }
      );
      await fetchSedes();
      messageApi.success("Estado de la sede actualizado.");
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 409 && data?.error === "SEDE_HAS_ACTIVE_ROOMS") {
        messageApi.error(
          data?.message ||
            "No puedes desactivar esta sede porque tiene habitaciones activas."
        );
      } else {
        messageApi.error(data?.message || "No se pudo actualizar el estado de la sede.");
      }
    } finally {
      setSedesLoading(false);
    }
  };

  const sedesColumns = useMemo(
    () => [
      {
        title: "Nombre",
        dataIndex: "name",
        key: "name",
        render: (name) => <Text style={{ fontSize: 12 }}>{name || "—"}</Text>,
      },
      {
        title: "Estado",
        dataIndex: "isActive",
        key: "isActive",
        width: 120,
        render: (isActive) => (
          <Tag color={isActive ? "green" : "default"} style={{ borderRadius: 999 }}>
            {isActive ? "Activa" : "Inactiva"}
          </Tag>
        ),
      },
      {
        title: "Acciones",
        key: "acciones",
        width: 140,
        render: (_, s) => (
          <Button size="small" onClick={() => handleToggleSedeStatus(s)} loading={sedesLoading}>
            {s.isActive ? "Desactivar" : "Activar"}
          </Button>
        ),
      },
    ],
    [sedesLoading]
  );

  const getRoomSedeLabel = (room) => {
    if (!room?.hotelCode) return "";
    const meta = getSedeMeta(room.hotelCode); // <- usa catálogo inyectado
    return meta.label || room.hotelCode;
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
          onOpenSedes={handleOpenSedes}
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
          sedesOptions={sedeOptions}
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
          onViewFutureReservations={abrirReservasFuturas}
        />
      </Card>

      <HabitacionFormModal
        visible={modalVisible}
        isMobile={isMobile}
        editando={editando}
        form={form}
        onCancel={cerrarModal}
        onOk={guardarHabitacion}
        saving={saving}
        sedesOptions={sedeOptions}
      />

      {/* MODAL: Reservas futuras por habitación */}
      <Modal
        open={reservasModal.open}
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: 700 }}>
              Reservas futuras · Hab{" "}
              {reservasModal.room?.codigo || reservasModal.room?.roomNumber || "—"}
            </Text>
            <Text style={{ fontSize: 11, color: "#6b7280" }}>
              {reservasModal.room?.title || "—"}
              {reservasModal.room?.hotelCode && <> · {getRoomSedeLabel(reservasModal.room)}</>}
            </Text>
          </div>
        }
        onCancel={cerrarReservasFuturas}
        footer={[
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => loadReservasFuturas({ page: reservasModal.page })}
            loading={reservasModal.loading}
          >
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

      {/* MODAL: Gestión de sedes */}
      <Modal
        open={sedesModalOpen}
        title="Gestión de sedes"
        onCancel={() => setSedesModalOpen(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Text style={{ fontSize: 11, color: "#6b7280" }}>
            Aquí puedes crear nuevas sedes y activar / desactivar las existentes.
          </Text>

          <Form form={sedeForm} layout="inline" size="small" onFinish={handleCreateSede}>
            <Form.Item
              label="Nombre de la sede"
              name="name"
              rules={[{ required: true, message: "Ingresa el nombre visible de la sede" }]}
            >
              <Input placeholder="Casa Frida" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={creatingSede}>
                Agregar sede
              </Button>
            </Form.Item>
          </Form>

          <Table
            size="small"
            rowKey={(s) => String(s._id)}
            columns={sedesColumns}
            dataSource={sedes}
            loading={sedesLoading}
            pagination={false}
          />
        </Space>
      </Modal>
    </>
  );
};

export default GestionHabitacionesView;
