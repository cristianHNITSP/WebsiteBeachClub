// src/components/habitaciones/HabitacionFormModal.jsx
import React from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Card,
  Space,
  Switch,
  Typography,
} from "antd";
import {
  SEDES,
  CAPACITY_OPTIONS,
  tiposHabitacion,
  INVENTORY_STATES,
  neutralsTheme as neutrals,
} from "./helpers";

const { Text, Title } = Typography;
const { Option } = Select;

const HabitacionFormModal = ({
  visible,
  isMobile,
  editando,
  form,
  onCancel,
  onOk,
}) => {
  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      onOk={onOk}
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
          Define datos base del inventario. No afecta reservas existentes, solo
          la estructura disponible.
        </Text>
      </Space>

      <Form form={form} layout="vertical" size="small">
        <Form.Item
          label="Código / Identificador"
          name="codigo"
          rules={[
            {
              required: true,
              message: "Ingresa el código de habitación (ej. CF-103)",
            },
          ]}
        >
          <Input placeholder="Ej. CF-103" />
        </Form.Item>

        <Form.Item
          label="Número físico / puerta"
          name="roomNumber"
          rules={[
            {
              required: true,
              message: "Ingresa el número físico de la habitación",
            },
          ]}
        >
          <Input placeholder="Ej. 103" />
        </Form.Item>

        <Form.Item
          label="Nombre interno / público"
          name="title"
          rules={[
            {
              required: true,
              message: "Ingresa el nombre de la habitación",
            },
          ]}
        >
          <Input placeholder="Ej. Suite Patio Privado" />
        </Form.Item>

        <Form.Item label="Ubicación" name="location">
          <Input placeholder="Ej. Tulum, frente al mar..." />
        </Form.Item>

        <Form.Item label="Imagen (URL)" name="img">
          <Input placeholder="https://ejemplo.com/foto.jpg" />
        </Form.Item>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
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
          </div>
          <div style={{ flex: 1 }}>
            <Form.Item label="Tipo de habitación" name="roomType">
              <Select placeholder="Tipo de habitación">
                {tiposHabitacion.map((t) => (
                  <Option key={t} value={t}>
                    {t}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
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
          </div>
          <div style={{ flex: 1 }}>
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
          </div>
        </div>

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

        {/* BLOQUE OFERTA ESPECIAL */}
        <Card
          size="small"
          style={{
            marginTop: 8,
            borderRadius: 10,
            background: "#f9fafb",
          }}
        >
          <Space direction="vertical" size={6} style={{ width: "100%" }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: neutrals.textMain,
              }}
            >
              Oferta especial (opcional)
            </Text>
            <Form.Item
              label="Activar oferta especial"
              name="offerIsSpecial"
              valuePropName="checked"
              style={{ marginBottom: 8 }}
            >
              <Switch
                size="small"
                checkedChildren="Activa"
                unCheckedChildren="Inactiva"
              />
            </Form.Item>

            <Form.Item
              label="Porcentaje de descuento (%)"
              name="offerDiscountPercent"
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const isSpecial = getFieldValue("offerIsSpecial");
                    if (!isSpecial) return Promise.resolve();
                    if (value == null) {
                      return Promise.reject(
                        new Error(
                          "Ingresa el porcentaje de descuento (1 - 99)"
                        )
                      );
                    }
                    if (value <= 0 || value >= 100) {
                      return Promise.reject(
                        new Error(
                          "El descuento debe ser mayor a 0 y menor a 100"
                        )
                      );
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
              style={{ marginBottom: 8 }}
            >
              <InputNumber
                min={1}
                max={99}
                step={1}
                style={{ width: "100%" }}
                addonAfter="%"
              />
            </Form.Item>

            <Form.Item label="Descripción de la oferta" name="offerDescription">
              <Input.TextArea
                rows={2}
                placeholder="Ej. Descuento limitado por lanzamiento, solo esta semana..."
              />
            </Form.Item>
          </Space>
        </Card>
      </Form>
    </Modal>
  );
};

export default HabitacionFormModal;
