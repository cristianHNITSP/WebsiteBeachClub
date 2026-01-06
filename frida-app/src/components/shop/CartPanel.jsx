// src/components/shop/CartPanel.jsx
import React from "react";
import {
  Card,
  Space,
  Typography,
  Button,
  Popconfirm,
  Tooltip,
  List,
  Divider,
  Tag,
  Empty,
} from "antd";
import {
  ShoppingCartOutlined,
  MinusOutlined,
  PlusOutlined,
  DeleteOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import ExpandPanel from "./ui/ExpandPanel";
import { beachColors, neutrals } from "../../theme/beachTheme";

const { Text } = Typography;

const money = (n) =>
  (Number(n) || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

function CartPanel({
  open,
  isMobile,
  siteLabel,
  cart,
  cartTotal,
  canPOS,
  onClose,
  onClearCart,
  onInc,
  onDec,
  onRemoveLine,
  onCheckout,
}) {
  return (
    <ExpandPanel open={open} maxHeight={820}>
      <Card
        bordered={false}
        style={{
          borderRadius: 18,
          marginTop: 12,
          boxShadow: "0 14px 32px rgba(15,23,42,0.08)",
          background: "#fff",
        }}
        bodyStyle={{ padding: isMobile ? 12 : 14 }}
        title={
          <Space>
            <ShoppingCartOutlined />
            <span>Carrito · {siteLabel || "sin sede"}</span>
          </Space>
        }
        extra={
          <Space>
            <Popconfirm
              title="Vaciar carrito"
              description="Se eliminarán todos los productos del carrito."
              okText="Vaciar"
              cancelText="Cancelar"
              onConfirm={onClearCart}
              disabled={!cart.length}
            >
              <Button disabled={!cart.length} icon={<DeleteOutlined />}>
                Vaciar
              </Button>
            </Popconfirm>

            <Button icon={<CloseOutlined />} onClick={onClose}>
              Cerrar
            </Button>
          </Space>
        }
      >
        {cart.length === 0 ? (
          <Empty description="Tu carrito está vacío" />
        ) : (
          <>
            <List
              dataSource={cart}
              renderItem={(it) => (
                <List.Item
                  style={{ padding: "10px 0" }}
                  actions={[
                    <Button
                      key="dec"
                      icon={<MinusOutlined />}
                      onClick={() => onDec(it.productId)}
                      style={{ borderRadius: 10 }}
                    />,
                    <Text
                      key="qty"
                      style={{
                        minWidth: 18,
                        textAlign: "center",
                        fontWeight: 900,
                      }}
                    >
                      {it.qty}
                    </Text>,
                    <Button
                      key="inc"
                      icon={<PlusOutlined />}
                      onClick={() => onInc(it.productId)}
                      style={{ borderRadius: 10 }}
                      disabled={it.qty >= it.stock}
                    />,
                    <Popconfirm
                      key="rm"
                      title="Quitar producto"
                      okText="Quitar"
                      cancelText="Cancelar"
                      onConfirm={() => onRemoveLine(it.productId)}
                    >
                      <Tooltip title="Quitar del carrito">
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          style={{ borderRadius: 10 }}
                        />
                      </Tooltip>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={<Text style={{ fontWeight: 900 }}>{it.name}</Text>}
                    description={
                      <Space size={10} wrap>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {money(it.unitPrice)} · stock {it.stock}
                        </Text>
                        <Tag
                          style={{
                            borderRadius: 999,
                            margin: 0,
                            fontWeight: 900,
                          }}
                        >
                          {money(it.qty * it.unitPrice)}
                        </Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />

            <Divider />

            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text>Total</Text>
                <Text style={{ fontWeight: 900, fontSize: 16 }}>
                  {money(cartTotal)}
                </Text>
              </div>

              <Popconfirm
                title="Confirmar venta"
                description="Se registrará la venta y se actualizará el stock."
                okText="Confirmar"
                cancelText="Cancelar"
                onConfirm={onCheckout}
                disabled={!canPOS}
              >
                <Button
                  type="primary"
                  block
                  disabled={!canPOS}
                  style={{
                    borderRadius: 14,
                    height: 44,
                    fontWeight: 900,
                    background: `linear-gradient(90deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
                  }}
                >
                  Confirmar venta
                </Button>
              </Popconfirm>

              {!canPOS && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Tu usuario no tiene acceso para confirmar ventas.
                </Text>
              )}
            </Space>
          </>
        )}
      </Card>
    </ExpandPanel>
  );
}

export default CartPanel;
