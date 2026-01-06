// src/components/habitaciones/HabitacionesTable.jsx
import {
  Table,
  Space,
  Typography,
  Badge,
  Button,
  Popconfirm,
  Tag,
  Grid,
  Skeleton,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  HeartFilled,
  RollbackOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import {
  getCapacityLabel,
  getEstadoMeta,
  getSedeMeta,
  hasPromo,
  beachTheme as beachColors,
  neutralsTheme as neutrals,
} from "./helpers";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const HabitacionesTable = ({
  loading,
  habitaciones,
  pagination,
  onChangePage,
  canManageRooms,
  onEdit,
  onTrash,
  onRestore,
  onDeletePermanent,
  deletingRoomId,
  onViewFutureReservations,
  sedesMeta = {}, // mapa opcional: { [sedeKey]: { label, color?, textColor? } }
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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
            {record.isDeleted && (
              <Tag
                style={{
                  borderRadius: 999,
                  fontSize: 10,
                  marginLeft: 6,
                }}
              >
                Papelera
              </Tag>
            )}
          </Space>
          <Text style={{ fontSize: 10, color: neutrals.textMuted }}>
            {record.title}
          </Text>
        </Space>
      ),
    },
    {
      title: "Sede",
      dataIndex: "hotelCode",
      key: "hotelCode",
      width: 130,
      responsive: ["md"],
      render: (hotelCode, record) => {
        // clave preferida: sedeKey (nuevo) o hotelCode (legacy)
        const key = record?.sedeKey || hotelCode;

        // 1) meta que venga del backend (si algún día lo envías)
        const apiMeta =
          key && sedesMeta && Object.prototype.hasOwnProperty.call(sedesMeta, key)
            ? sedesMeta[key]
            : null;

        // 2) fallback legacy: helpers.js (Casa Frida / Cabañas Frida)
        const legacyMeta = getSedeMeta(hotelCode);

        const label =
          apiMeta?.label ||
          apiMeta?.name ||
          legacyMeta.label ||
          hotelCode ||
          "Sin sede";
        const color = apiMeta?.color || legacyMeta.color || "#e5e7eb";
        const textColor = apiMeta?.textColor || legacyMeta.textColor || "#111827";

        return (
          <Tag
            color={color}
            style={{
              borderRadius: 999,
              fontSize: 10,
              color: textColor,
            }}
          >
            {label}
          </Tag>
        );
      },
    },
    {
      title: "Tipo",
      dataIndex: "roomType",
      key: "roomType",
      width: 100,
      responsive: ["md"],
      render: (roomType) => (
        <Text style={{ fontSize: 11, color: neutrals.textMuted }}>
          {roomType}
        </Text>
      ),
    },
    {
      title: "Ubicación",
      dataIndex: "location",
      key: "location",
      width: 160,
      responsive: ["lg"],
      render: (location) => (
        <Text style={{ fontSize: 11, color: neutrals.textMuted }}>
          {location}
        </Text>
      ),
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
      title: "Promo",
      dataIndex: "offer",
      key: "offer",
      width: 120,
      responsive: ["md"],
      render: (_, record) => {
        if (!hasPromo(record)) {
          return (
            <Tag
              style={{
                borderRadius: 999,
                fontSize: 10,
                color: neutrals.textMuted,
              }}
            >
              Sin promo
            </Tag>
          );
        }
        const pct = record.offer.discountPercent;
        return (
          <Tag
            color={beachColors.sunset}
            style={{
              borderRadius: 999,
              fontSize: 10,
              color: "#7c2d12",
            }}
          >
            -{pct}% OFF
          </Tag>
        );
      },
    },
    {
      title: "Favoritos",
      dataIndex: "favoritesCount",
      key: "favoritesCount",
      align: "center",
      width: 110,
      responsive: ["md"],
      render: (favoritesCount) => {
        const favs = favoritesCount || 0;
        return (
          <Space size={4} style={{ justifyContent: "center" }}>
            <HeartFilled
              style={{
                fontSize: 12,
                color: favs > 0 ? beachColors.coral : "#d1d5db",
              }}
            />
            <Text
              style={{
                fontSize: 11,
                color: favs > 0 ? neutrals.textMain : neutrals.textMuted,
              }}
            >
              {favs}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Estado",
      dataIndex: "inventoryStatus",
      key: "inventoryStatus",
      width: 100,
      render: (estado, record) => {
        const meta = getEstadoMeta(estado);
        return (
          <Tag
            color={meta.color}
            style={{
              borderRadius: 999,
              fontSize: 10,
              color: meta.textColor,
              opacity: record.isDeleted ? 0.65 : 1,
            }}
          >
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      align: "right",
      width: isMobile ? 260 : 360,
      render: (_, record) => {
        const viewBtn = (
          <Button
            size="small"
            type="text"
            icon={<HistoryOutlined />}
            onClick={() => onViewFutureReservations?.(record)}
            disabled={loading}
            style={{ color: beachColors.teal }}
          >
            Reservas futuras
          </Button>
        );

        if (!canManageRooms) {
          return <Space size={4}>{viewBtn}</Space>;
        }

        return (
          <Space size={4}>
            {viewBtn}

            {!record.isDeleted ? (
              <>
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(record)}
                  disabled={loading}
                  style={{ color: beachColors.deepBlue }}
                >
                  Editar
                </Button>

                <Popconfirm
                  title="Enviar a papelera"
                  description="La habitación se oculta del público y del inventario activo. Se puede restaurar."
                  okText="Enviar"
                  cancelText="Cancelar"
                  onConfirm={() => onTrash(record._id)}
                >
                  <Button
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    loading={deletingRoomId === record._id}
                    style={{ color: beachColors.coral }}
                  >
                    Papelera
                  </Button>
                </Popconfirm>
              </>
            ) : (
              <>
                <Popconfirm
                  title="Restaurar habitación"
                  description="Vuelve al inventario activo."
                  okText="Restaurar"
                  cancelText="Cancelar"
                  onConfirm={() => onRestore(record._id)}
                >
                  <Button
                    size="small"
                    type="text"
                    loading={deletingRoomId === record._id}
                    style={{ color: beachColors.teal }}
                  >
                    Restaurar
                  </Button>
                </Popconfirm>

                <Popconfirm
                  title="Eliminar permanente"
                  description="Esto borra el documento de Mongo. No se puede deshacer."
                  okText="Eliminar definitivo"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDeletePermanent(record._id)}
                >
                  <Button
                    size="small"
                    danger
                    type="text"
                    loading={deletingRoomId === record._id}
                    style={{ color: "#b91c1c" }}
                  >
                    Eliminar definitivo
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  const showSkeleton =
    loading && (!habitaciones || habitaciones.length === 0);
  if (showSkeleton) {
    return (
      <div style={{ marginTop: 8 }}>
        {[1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            style={{
              padding: "10px 8px",
              marginBottom: 6,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Skeleton.Avatar active size="small" shape="circle" />
            <div style={{ flex: 1 }}>
              <Skeleton.Input
                active
                size="small"
                style={{
                  width: "60%",
                  marginBottom: 4,
                }}
              />
              <Skeleton.Input
                active
                size="small"
                style={{ width: "40%" }}
              />
            </div>
            {!isMobile && (
              <div style={{ width: 140 }}>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: "100%" }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 4, overflowX: "auto" }}>
      <Table
        size="small"
        columns={columns}
        dataSource={habitaciones}
        rowKey="_id"
        loading={loading}
        pagination={{
          ...pagination,
          pageSize: 5,
          showSizeChanger: false,
        }}
        onChange={(pag) => onChangePage(pag.current || 1)}
        style={{ marginTop: 4 }}
        scroll={{ x: "max-content" }}
      />
    </div>
  );
};

export default HabitacionesTable;
