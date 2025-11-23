// src/views/GestionHabitacionesView.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  Row,
  Col,
  Space,
  Typography,
  Input,
  Select,
  Button,
  Table,
  Tag,
  Modal,
  Form,
  Popconfirm,
  Badge,
  InputNumber,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { beachColors, neutrals } from "../theme/beachTheme";

const { Text, Title } = Typography;
const { Option } = Select;

// Mapeo de hotelCode a etiquetas
const SEDES = [
  { label: "Casa Frida", value: "casa_frida" },
  { label: "Cabañas Frida", value: "cabanas_fridas" },
];

// Opciones de capacidad (usando size del backend) + label semántico
const CAPACITY_OPTIONS = [
  { label: "1 adulto", value: 1 },
  { label: "2 adultos", value: 2 },
  { label: "3 adultos", value: 3 },
  { label: "Familia", value: 4 },
];

const tiposHabitacion = [
  "Suite",
  "Suite Jardín",
  "Cabaña",
  "Loft",
  "Doble",
  "King",
];

const INVENTORY_STATES = [
  "Activa",
  "Mantenimiento",
  "Fuera de servicio",
  "Bloqueada",
];

const getCapacityLabel = (size) => {
  const found = CAPACITY_OPTIONS.find((o) => o.value === size);
  return found ? found.label : "-";
};

const getEstadoTag = (estado) => {
  switch (estado) {
    case "Activa":
      return (
        <Tag
          color={beachColors.teal}
          style={{
            borderRadius: 999,
            fontSize: 10,
            color: "#064e3b",
          }}
        >
          Activa
        </Tag>
      );
    case "Mantenimiento":
      return (
        <Tag
          color={beachColors.sunset}
          style={{
            borderRadius: 999,
            fontSize: 10,
            color: "#7c2d12",
          }}
        >
          Mantenimiento
        </Tag>
      );
    case "Fuera de servicio":
      return (
        <Tag
          color={beachColors.coral}
          style={{
            borderRadius: 999,
            fontSize: 10,
            color: "#7f1d1d",
          }}
        >
          Fuera de servicio
        </Tag>
      );
    case "Bloqueada":
      return (
        <Tag
          color="#9ca3af"
          style={{
            borderRadius: 999,
            fontSize: 10,
            color: "#111827",
          }}
        >
          Bloqueada
        </Tag>
      );
    default:
      return (
        <Tag
          style={{
            borderRadius: 999,
            fontSize: 10,
          }}
        >
          {estado || "-"}
        </Tag>
      );
  }
};

const getSedeLabel = (hotelCode) => {
  const found = SEDES.find((s) => s.value === hotelCode);
  return found ? found.label : hotelCode || "-";
};

const getSedeTag = (hotelCode) => {
  const label = getSedeLabel(hotelCode);
  const color =
    hotelCode === "casa_frida" ? beachColors.oceanBlue : beachColors.turquoise;
  return (
    <Tag
      color={color}
      style={{
        borderRadius: 999,
        fontSize: 10,
        color: "#0f172a",
      }}
    >
      {label}
    </Tag>
  );
};

const GestionHabitacionesView = ({ isMobile }) => {
  const [habitaciones, setHabitaciones] = useState([]);
  const [loading, setLoading] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroSede, setFiltroSede] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form] = Form.useForm();

  // ====== CARGA INICIAL ======
  const fetchHabitaciones = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/habitaciones");
      setHabitaciones(res.data || []);
    } catch (err) {
      console.error(err);
      message.error("No se pudieron cargar las habitaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabitaciones();
  }, []);

  const abrirCrear = () => {
    setEditando(null);
    form.resetFields();
    setModalVisible(true);
  };

  const abrirEditar = (registro) => {
    setEditando(registro);
    form.setFieldsValue({
      codigo: registro.codigo,
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
    });
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditando(null);
    form.resetFields();
  };

  // ====== CREAR / EDITAR ======
  const guardarHabitacion = () => {
    form
      .validateFields()
      .then(async (values) => {
        try {
          // Derivar capacityLabel desde size
          const capOpt = CAPACITY_OPTIONS.find((o) => o.value === values.size);
          const payload = {
            ...values,
            capacityLabel: capOpt ? capOpt.label : undefined,
          };

          if (editando) {
            await axios.put(`/api/habitaciones/${editando.id}`, {
              ...editando,
              ...payload,
            });
            message.success("Habitación actualizada");
          } else {
            await axios.post("/api/habitaciones", payload);
            message.success("Habitación creada");
          }

          // Siempre recargar desde la BD para evitar datos en memoria desfasados
          await fetchHabitaciones();
          cerrarModal();
        } catch (err) {
          console.error(err);
          message.error("Error al guardar la habitación");
        }
      })
      .catch(() => {});
  };

  // ====== ELIMINAR ======
  const eliminarHabitacion = async (id) => {
    try {
      await axios.delete(`/api/habitaciones/${id}`);
      message.success("Habitación eliminada del inventario");
      await fetchHabitaciones();
    } catch (err) {
      console.error(err);
      message.error("No se pudo eliminar la habitación");
    }
  };

  // ====== FILTROS / MÉTRICAS ======
  const habitacionesFiltradas = habitaciones
    .filter((h) =>
      filtroSede === "todas" ? true : h.hotelCode === filtroSede
    )
    .filter((h) =>
      filtroEstado === "todas" ? true : h.inventoryStatus === filtroEstado
    )
    .filter((h) => {
      const q = busqueda.toLowerCase().trim();
      if (!q) return true;
      return (
        (h.codigo || "").toLowerCase().includes(q) ||
        (h.title || "").toLowerCase().includes(q) ||
        (h.roomType || "").toLowerCase().includes(q) ||
        (h.location || "").toLowerCase().includes(q)
      );
    });

  const totalActivas = habitaciones.filter(
    (h) => h.inventoryStatus === "Activa"
  ).length;
  const totalMantenimiento = habitaciones.filter(
    (h) => h.inventoryStatus === "Mantenimiento"
  ).length;
  const totalFuera = habitaciones.filter(
    (h) => h.inventoryStatus === "Fuera de servicio"
  ).length;

  // ====== COLUMNAS ======
  const columns = [
    {
      title: "Habitación",
      dataIndex: "codigo",
      key: "codigo",
      render: (codigo, record) => (
        <Space direction="vertical" size={0}>
          <Space size={6}>
            <HomeOutlined
              style={{ fontSize: 13, color: beachColors.deepBlue }}
            />
            <Text
              style={{
                fontWeight: 600,
                color: neutrals.textMain,
                fontSize: 12,
              }}
            >
              {codigo}
            </Text>
          </Space>
          <Text
            style={{
              fontSize: 10,
              color: neutrals.textMuted,
            }}
          >
            {record.title}
          </Text>
        </Space>
      ),
    },
    {
      title: "Sede",
      dataIndex: "hotelCode",
      key: "hotelCode",
      render: (hotelCode) => getSedeTag(hotelCode),
      width: 130,
    },
    {
      title: "Tipo",
      dataIndex: "roomType",
      key: "roomType",
      render: (roomType) => (
        <Text
          style={{
            fontSize: 11,
            color: neutrals.textMuted,
          }}
        >
          {roomType}
        </Text>
      ),
      width: 150,
    },
    {
      title: "Ubicación",
      dataIndex: "location",
      key: "location",
      render: (location) => (
        <Text
          style={{
            fontSize: 11,
            color: neutrals.textMuted,
          }}
        >
          {location}
        </Text>
      ),
      width: 160,
    },
    {
      title: "Capacidad",
      dataIndex: "size",
      key: "size",
      align: "center",
      width: 110,
      render: (size) => (
        <Badge
          count={getCapacityLabel(size)}
          style={{
            backgroundColor: beachColors.turquoise,
            color: "#064e3b",
            fontSize: 9,
          }}
        />
      ),
    },
    {
      title: "Tarifa base",
      dataIndex: "price",
      key: "price",
      align: "right",
      width: 110,
      render: (price) => (
        <Text
          style={{
            fontSize: 11,
            color: neutrals.textMain,
            fontWeight: 500,
          }}
        >
          ${Number(price || 0).toLocaleString("es-MX")}
        </Text>
      ),
    },
    {
      title: "Estado",
      dataIndex: "inventoryStatus",
      key: "inventoryStatus",
      width: 130,
      render: (estado) => getEstadoTag(estado),
    },
    {
      title: "Acciones",
      key: "acciones",
      align: "right",
      width: 140,
      render: (_, record) => (
        <Space size={4}>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => abrirEditar(record)}
            style={{ color: beachColors.deepBlue }}
          >
            Editar
          </Button>
          <Popconfirm
            title="Eliminar habitación"
            description="Esta acción no elimina reservas históricas, solo el registro del inventario."
            okText="Eliminar"
            cancelText="Cancelar"
            onConfirm={() => eliminarHabitacion(record.id)}
          >
            <Button
              size="small"
              type="text"
              icon={<DeleteOutlined />}
              style={{ color: beachColors.coral }}
            >
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
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
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={2}>
              <Title
                level={5}
                style={{
                  margin: 0,
                  color: neutrals.textMain,
                  fontWeight: 600,
                }}
              >
                Configuración de habitaciones
              </Title>
              <Text
                style={{
                  fontSize: 11,
                  color: neutrals.textMuted,
                }}
              >
                Administra el inventario físico de habitaciones para Casa
                Frida y Cabañas Frida. Esto no modifica reservas, solo la
                estructura disponible.
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Space
              size={8}
              style={{
                width: "100%",
                justifyContent: isMobile ? "flex-start" : "flex-end",
                flexWrap: "wrap",
              }}
            >
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={abrirCrear}
                style={{
                  borderRadius: 999,
                  background: beachColors.oceanBlue,
                  borderColor: beachColors.oceanBlue,
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                Nueva habitación
              </Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={[10, 10]} style={{ marginTop: 10 }} align="middle">
          <Col xs={24} md={10}>
            <Input
              size="small"
              placeholder="Buscar por código, nombre, tipo o ubicación..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              allowClear
              style={{ fontSize: 11 }}
            />
          </Col>
          <Col xs={12} md={7}>
            <Select
              size="small"
              value={filtroSede}
              onChange={setFiltroSede}
              style={{ width: "100%", fontSize: 11 }}
            >
              <Option value="todas">Todas las sedes</Option>
              {SEDES.map((s) => (
                <Option key={s.value} value={s.value}>
                  {s.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} md={7}>
            <Select
              size="small"
              value={filtroEstado}
              onChange={setFiltroEstado}
              style={{ width: "100%", fontSize: 11 }}
            >
              <Option value="todas">Todos los estados</Option>
              {INVENTORY_STATES.map((e) => (
                <Option key={e} value={e}>
                  {e}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        <Row gutter={12} style={{ marginTop: 10, marginBottom: 4 }}>
          <Col xs={24} md={8}>
            <Text
              style={{
                fontSize: 10,
                color: neutrals.textMuted,
              }}
            >
              Habitaciones activas:{" "}
              <span
                style={{
                  fontWeight: 600,
                  color: beachColors.teal,
                }}
              >
                {totalActivas}
              </span>
            </Text>
          </Col>
          <Col xs={24} md={8}>
            <Text
              style={{
                fontSize: 10,
                color: neutrals.textMuted,
              }}
            >
              En mantenimiento:{" "}
              <span
                style={{
                  fontWeight: 600,
                  color: beachColors.sunset,
                }}
              >
                {totalMantenimiento}
              </span>
            </Text>
          </Col>
          <Col xs={24} md={8}>
            <Text
              style={{
                fontSize: 10,
                color: neutrals.textMuted,
              }}
            >
              Fuera de servicio / bloqueadas:{" "}
              <span
                style={{
                  fontWeight: 600,
                  color: beachColors.coral,
                }}
              >
                {totalFuera}
              </span>
            </Text>
          </Col>
        </Row>

        <Table
          size="small"
          columns={columns}
          dataSource={habitacionesFiltradas}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 6,
            size: "small",
            showSizeChanger: false,
          }}
          style={{ marginTop: 4 }}
        />
      </Card>

      {/* Modal Crear / Editar */}
      <Modal
        open={modalVisible}
        onCancel={cerrarModal}
        onOk={guardarHabitacion}
        okText={editando ? "Guardar cambios" : "Crear habitación"}
        cancelText="Cancelar"
        centered
        width={isMobile ? 360 : 520}
        bodyStyle={{ paddingTop: 12 }}
      >
        <Space
          direction="vertical"
          size={4}
          style={{ width: "100%", marginBottom: 4 }}
        >
          <Title
            level={5}
            style={{
              margin: 0,
              color: neutrals.textMain,
              fontWeight: 600,
            }}
          >
            {editando ? "Editar habitación" : "Nueva habitación"}
          </Title>
          <Text
            style={{
              fontSize: 11,
              color: neutrals.textMuted,
            }}
          >
            Define datos base del inventario. No afecta reservas existentes,
            solo la estructura disponible.
          </Text>
        </Space>

        <Form form={form} layout="vertical" size="small">
          <Form.Item
            label="Código / Número"
            name="codigo"
            rules={[
              {
                required: true,
                message: "Ingresa el código o número de habitación",
              },
            ]}
          >
            <Input placeholder="Ej. CF-103" />
          </Form.Item>

          <Form.Item label="Nombre interno / público" name="title">
            <Input placeholder="Ej. Suite Patio Privado" />
          </Form.Item>

          <Form.Item label="Ubicación" name="location">
            <Input placeholder="Ej. Tulum, frente al mar..." />
          </Form.Item>

          <Form.Item label="Imagen (URL)" name="img">
            <Input placeholder="https://ejemplo.com/foto.jpg" />
          </Form.Item>

          <Row gutter={8}>
            <Col span={12}>
              <Form.Item
                label="Sede"
                name="hotelCode"
                rules={[
                  {
                    required: true,
                    message: "Selecciona la sede",
                  },
                ]}
              >
                <Select placeholder="Selecciona">
                  {SEDES.map((s) => (
                    <Option key={s.value} value={s.value}>
                      {s.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Tipo de habitación" name="roomType">
                <Select placeholder="Tipo de habitación">
                  {tiposHabitacion.map((t) => (
                    <Option key={t} value={t}>
                      {t}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={8}>
            <Col span={12}>
              <Form.Item
                label="Capacidad"
                name="size"
                rules={[
                  {
                    required: true,
                    message: "Selecciona la capacidad",
                  },
                ]}
              >
                <Select placeholder="Capacidad">
                  {CAPACITY_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Tarifa base por noche"
                name="price"
                rules={[
                  {
                    required: true,
                    message: "Ingresa la tarifa base",
                  },
                ]}
              >
                <InputNumber
                  min={0}
                  step={50}
                  style={{ width: "100%" }}
                  prefix="$"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Estado del inventario"
            name="inventoryStatus"
            rules={[
              {
                required: true,
                message: "Selecciona el estado",
              },
            ]}
          >
            <Select placeholder="Selecciona el estado">
              {INVENTORY_STATES.map((e) => (
                <Option key={e} value={e}>
                  {e}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Insignia (badge)" name="badge">
            <Input placeholder="Ej. Vista al mar, Mejor precio..." />
          </Form.Item>

          <Form.Item label="Destacada" name="featured">
            <Select placeholder="¿Destacada?">
              <Option value={true}>Sí</Option>
              <Option value={false}>No</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Amenidades" name="amenities">
            <Select
              mode="tags"
              style={{ width: "100%" }}
              placeholder="WiFi, Aire acondicionado, TV..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default GestionHabitacionesView;
