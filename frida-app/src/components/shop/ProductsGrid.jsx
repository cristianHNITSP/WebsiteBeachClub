// src/components/shop/ProductsGrid.jsx
import React, { useState } from "react";
import {
  Row,
  Col,
  Card,
  Skeleton,
  Empty,
  Tag,
  Button,
  Dropdown,
  Space,
  Flex,
  Popconfirm,
  Avatar,
  Tooltip,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  WarningOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { beachColors, neutrals } from "../../theme/beachTheme";

const money = (n) =>
  (Number(n) || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

function ProductsGrid({
  loading,
  products,
  isMobile,
  canPOS,
  canManage,
  onAddToCart,
  onEditProduct,
  onDeleteProduct,
}) {
  const [addingId, setAddingId] = useState(null);
  const CARD_MIN_HEIGHT = isMobile ? 180 : 196;

  if (loading) {
    return (
      <Row gutter={[12, 12]}>
        {Array.from({ length: isMobile ? 6 : 10 }).map((_, idx) => (
          <Col key={idx} xs={12} sm={8} md={6} lg={6} xl={4}>
            <Card
              bordered={false}
              style={{
                borderRadius: 16,
                boxShadow: "0 10px 22px rgba(15,23,42,0.08)",
              }}
              bodyStyle={{ padding: 12 }}
            >
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  if (!products.length) {
    return (
      <Empty
        description="No encontramos productos con esos filtros."
        style={{ marginTop: 18 }}
      />
    );
  }

  const handleAddClick = (p) => {
    if (!canPOS) {
      onEditProduct(p);
      return;
    }

    setAddingId(p._id);
    onAddToCart(p);
    // mini feedback visual: loading corto usando solo AntD
    setTimeout(() => {
      setAddingId(null);
    }, 220);
  };

  return (
    <Row gutter={[12, 12]}>
      {products.map((p) => {
        const low =
          Number(p.stock || 0) <= Number(p.minStock || 0) &&
          Number(p.stock || 0) > 0;
        const out = Number(p.stock || 0) <= 0;

        const menuItems = [
          {
            key: "edit",
            icon: <EditOutlined />,
            label: "Editar",
            onClick: () => onEditProduct(p),
          },
          {
            key: "del",
            danger: true,
            icon: <DeleteOutlined />,
            label: (
              <Popconfirm
                title="Enviar a papelera"
                description="Podrás restaurarlo desde Gestión."
                okText="Enviar"
                cancelText="Cancelar"
                onConfirm={() => onDeleteProduct(p)}
              >
                <span>Enviar a papelera</span>
              </Popconfirm>
            ),
          },
        ];

        return (
          <Col
            key={p._id}
            xs={12}
            sm={8}
            md={6}
            lg={6}
            xl={4}
            style={{ display: "flex" }}
          >
            <Card
              hoverable
              bordered={false}
              style={{
                width: "100%",
                height: "100%",
                minHeight: CARD_MIN_HEIGHT,
                borderRadius: 16,
                boxShadow: "0 10px 22px rgba(15,23,42,0.08)",
                background: out ? "rgba(148,163,184,0.10)" : "#fff",
                opacity: out ? 0.78 : 1,
              }}
              bodyStyle={{
                padding: isMobile ? 10 : 12,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Flex vertical gap={isMobile ? 8 : 10} style={{ height: "100%" }}>
                {/* Header: layout diferente para móvil vs desktop */}
                {isMobile ? (
                  <Flex align="flex-start" gap={8}>
                    {p.imageUrl ? (
                      <Avatar
                        shape="square"
                        size={38}
                        src={p.imageUrl}
                        alt={p.name}
                        style={{ borderRadius: 8 }}
                      />
                    ) : (
                      <Avatar
                        shape="square"
                        size={38}
                        style={{
                          borderRadius: 8,
                          backgroundColor: beachColors.oceanBlue,
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {String(p.name || "?").charAt(0).toUpperCase()}
                      </Avatar>
                    )}

                    <Flex vertical style={{ flex: 1, minWidth: 0 }} gap={4}>
                      <span
                        style={{
                          fontWeight: 900,
                          color: neutrals.textMain,
                          fontSize: 12,
                          lineHeight: 1.2,
                          display: "inline-block",
                          wordBreak: "break-word",
                        }}
                        title={p.name}
                      >
                        {p.name}
                      </span>

                      <Flex
                        align="center"
                        justify="space-between"
                        style={{ width: "100%" }}
                        gap={6}
                      >
                        <Tag
                          style={{
                            borderRadius: 999,
                            border: "none",
                            background: "rgba(59,130,246,0.10)",
                            color: beachColors.deepBlue,
                            fontSize: 10,
                            margin: 0,
                            fontWeight: 900,
                          }}
                        >
                          {money(p.unitPrice)}
                        </Tag>

                        {canManage && (
                          <Dropdown trigger={["click"]} menu={{ items: menuItems }}>
                            <Button
                              size="small"
                              type="text"
                              icon={<MoreOutlined />}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: 26,
                                height: 26,
                                padding: 0,
                                borderRadius: 8,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: neutrals.textMuted,
                              }}
                            />
                          </Dropdown>
                        )}
                      </Flex>
                    </Flex>
                  </Flex>
                ) : (
                  <Flex align="flex-start" justify="space-between" gap={10}>
                    <Space align="flex-start">
                      {p.imageUrl ? (
                        <Avatar
                          shape="square"
                          size={40}
                          src={p.imageUrl}
                          alt={p.name}
                          style={{ borderRadius: 10 }}
                        />
                      ) : (
                        <Avatar
                          shape="square"
                          size={40}
                          style={{
                            borderRadius: 10,
                            backgroundColor: beachColors.oceanBlue,
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {String(p.name || "?").charAt(0).toUpperCase()}
                        </Avatar>
                      )}

                      <span
                        style={{
                          fontWeight: 900,
                          color: neutrals.textMain,
                          fontSize: 13,
                          lineHeight: 1.15,
                          flex: 1,
                          minWidth: 0,
                          display: "inline-block",
                        }}
                        title={p.name}
                      >
                        {p.name}
                      </span>
                    </Space>

                    <Space size={6} align="start">
                      <Tag
                        style={{
                          borderRadius: 999,
                          border: "none",
                          background: "rgba(59,130,246,0.10)",
                          color: beachColors.deepBlue,
                          fontSize: 10,
                          margin: 0,
                          fontWeight: 900,
                        }}
                      >
                        {money(p.unitPrice)}
                      </Tag>

                      {canManage && (
                        <Dropdown trigger={["click"]} menu={{ items: menuItems }}>
                          <Button
                            size="small"
                            type="text"
                            icon={<MoreOutlined />}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: 28,
                              height: 28,
                              padding: 0,
                              borderRadius: 10,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: neutrals.textMuted,
                            }}
                          />
                        </Dropdown>
                      )}
                    </Space>
                  </Flex>
                )}

                {/* Stock + estado */}
                <Flex align="center" justify="space-between">
                  <span
                    style={{
                      fontSize: 11,
                      color: neutrals.textMuted,
                      maxWidth: isMobile ? "70%" : "100%",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Stock:{" "}
                    <b style={{ color: neutrals.textMain }}>{p.stock}</b>
                  </span>

                  {out ? (
                    <Tag
                      color="red"
                      style={{ borderRadius: 999, margin: 0, fontSize: 10 }}
                    >
                      Agotado
                    </Tag>
                  ) : low ? (
                    <Tag
                      icon={<WarningOutlined />}
                      color="gold"
                      style={{ borderRadius: 999, margin: 0, fontSize: 10 }}
                    >
                      Bajo
                    </Tag>
                  ) : (
                    <Tag
                      color="green"
                      style={{ borderRadius: 999, margin: 0, fontSize: 10 }}
                    >
                      OK
                    </Tag>
                  )}
                </Flex>

                {/* Empuja el botón hacia abajo para alinear en la grid */}
                <div style={{ flex: 1 }} />

                {/* Botón principal: ahora 100% Ant Design (hover + wave) */}
                <Tooltip title={canPOS ? "Agregar al carrito" : "Editar producto"}>
                  <Button
                    type={out ? "default" : "primary"}
                    shape="round"
                    block
                    size={isMobile ? "small" : "middle"}
                    disabled={(!canPOS && !canManage) || out}
                    loading={addingId === p._id && canPOS}
                    icon={canPOS ? <PlusOutlined /> : <EditOutlined />}
                    style={{
                      fontWeight: 900,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddClick(p);
                    }}
                  >
                    {out
                      ? "Sin stock"
                      : canPOS
                      ? "Agregar"
                      : "Editar"}
                  </Button>
                </Tooltip>
              </Flex>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}

export default ProductsGrid;
