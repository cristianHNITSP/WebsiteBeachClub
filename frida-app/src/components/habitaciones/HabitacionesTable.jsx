// src/components/habitaciones/HabitacionesTable.jsx
import React from "react";
import {
  Table,
  Space,
  Typography,
  Badge,
  Button,
  Popconfirm,
  Tag,
  Select,
  Grid,
  Skeleton,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  HeartFilled,
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
const { Option } = Select;
const { useBreakpoint } = Grid;

const HabitacionesTable = ({
  loading,
  habitaciones,
  pagination,
  onChangePage,
  canManageRooms,
  onEdit,
  onDelete,
  onChangeEstadoReserva,
  changingEstadoReservaId,
  deletingRoomId,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md hacia arriba = escritorio

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
      width: 130,
      responsive: ["md"], // solo >= md
      render: (hotelCode) => {
        const meta = getSedeMeta(hotelCode);
        return (
          <Tag
            color={meta.color}
            style={{
              borderRadius: 999,
              fontSize: 10,
              color: meta.textColor,
            }}
          >
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: "Tipo",
      dataIndex: "roomType",
      key: "roomType",
      width: 150,
      responsive: ["md"],
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
    },
    {
      title: "Ubicación",
      dataIndex: "location",
      key: "location",
      width: 160,
      responsive: ["lg"], // solo pantallas grandes
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
                color:
                  favs > 0 ? neutrals.textMain : neutrals.textMuted,
              }}
            >
              {favs}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Estado reserva",
      dataIndex: "estadoDeReserva",
      key: "estadoDeReserva",
      width: 150,
      render: (estadoDeReserva, record) => {
        const value =
          typeof estadoDeReserva === "number" ? estadoDeReserva : 0;

        const options = [
          {
            value: 0,
            label: "No reservada",
            color: "#e5e7eb",
            text: neutrals.textMain,
          },
          {
            value: 1,
            label: "Reservada",
            color: beachColors.teal,
            text: "#064e3b",
          },
          {
            value: 3, // 🔁 En espera ahora es 3
            label: "En espera",
            color: beachColors.sunset,
            text: "#7c2d12",
          },
        ];

        const current =
          options.find((o) => o.value === value) || options[0];

        if (!canManageRooms) {
          return (
            <Tag
              color={current.color}
              style={{
                borderRadius: 999,
                fontSize: 10,
                color: current.text,
              }}
            >
              {current.label}
            </Tag>
          );
        }

        const isChanging = changingEstadoReservaId === record._id;

        return (
          <div style={{ position: "relative" }}>
            {isChanging && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.6)",
                  zIndex: 1,
                }}
              />
            )}
            <Select
              size="small"
              value={value}
              disabled={isChanging}
              onChange={(val) =>
                onChangeEstadoReserva &&
                onChangeEstadoReserva(record._id, val)
              }
              style={{ width: "100%", fontSize: 11 }}
            >
              {options.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </div>
        );
      },
    },
    {
      title: "Estado",
      dataIndex: "inventoryStatus",
      key: "inventoryStatus",
      width: 130,
      render: (estado) => {
        const meta = getEstadoMeta(estado);
        return (
          <Tag
            color={meta.color}
            style={{
              borderRadius: 999,
              fontSize: 10,
              color: meta.textColor,
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
      width: isMobile ? 130 : 160,
      render: (_, record) =>
        canManageRooms ? (
          <Space size={4}>
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
              title="Eliminar habitación"
              description="Esta acción quita la habitación del inventario físico, pero conserva las reservas históricas."
              okText="Eliminar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(record._id)}
            >
              <Button
                size="small"
                type="text"
                icon={<DeleteOutlined />}
                loading={deletingRoomId === record._id}
                style={{ color: beachColors.coral }}
              >
                Eliminar
              </Button>
            </Popconfirm>
          </Space>
        ) : (
          <Text style={{ fontSize: 10, color: neutrals.textMuted }}>
            Sin permisos
          </Text>
        ),
    },
  ];

  const showSkeleton =
    loading && (!habitaciones || habitaciones.length === 0);

  if (showSkeleton) {
    const skeletonRows = [1, 2, 3, 4, 5];
    return (
      <div style={{ marginTop: 8 }}>
        {skeletonRows.map((row) => (
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
                style={{ width: "60%", marginBottom: 4 }}
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
