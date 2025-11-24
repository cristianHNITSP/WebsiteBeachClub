// src/components/habitaciones/HabitacionesTable.jsx
import React from "react";
import {
  Table,
  Space,
  Typography,
  Badge,
  Button,
  Popconfirm,
  Spin,
  Tag,
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

const HabitacionesTable = ({
  loading,
  habitaciones,
  pagination,
  onChangePage,
  canManageRooms,
  onEdit,
  onDelete,
}) => {
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
      width: 160,
      render: (_, record) =>
        canManageRooms ? (
          <Space size={4}>
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
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

  return (
    <div style={{ marginTop: 4 }}>
      <Spin spinning={loading} tip="Cargando habitaciones...">
        <Table
          size="small"
          columns={columns}
          dataSource={habitaciones}
          rowKey="_id"
          pagination={{
            ...pagination,
            pageSize: 5,
            showSizeChanger: false,
          }}
          onChange={(pag) => onChangePage(pag.current || 1)}
          style={{ marginTop: 4 }}
        />
      </Spin>
    </div>
  );
};

export default HabitacionesTable;
