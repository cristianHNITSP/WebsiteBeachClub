// src/components/shop/ProductModal.jsx
import React from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  InputNumber,
  Switch,
  Typography,
} from "antd";

const { Text } = Typography;

function ProductModal({
  open,
  editingProduct,
  form,
  siteOptions,
  categories,
  onCancel,
  onOk,
}) {
  return (
    <Modal
      title={editingProduct ? "Editar producto" : "Nuevo producto"}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText={editingProduct ? "Guardar" : "Crear"}
      cancelText="Cancelar"
      destroyOnClose
      width={560}
    >
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={14}>
            <Form.Item
              label="Nombre"
              name="name"
              rules={[
                { required: true, message: "Nombre requerido" },
                { min: 2, message: "Mínimo 2 caracteres" },
              ]}
            >
              <Input placeholder="Ej: Agua 600ml" />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label="Sección"
              name="section"
              rules={[{ required: true, message: "Sección requerida" }]}
            >
              <Select
                options={[
                  { label: "Normal", value: "normal" },
                  { label: "Alcohol", value: "alcohol" },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Sede"
              name="site"
              rules={[{ required: true, message: "Sede requerida" }]}
            >
              <Select options={siteOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Categoría"
              name="categoryId"
              rules={[{ required: true, message: "Categoría requerida" }]}
            >
              <Select
                options={categories.map((c) => ({
                  label: c.name,
                  value: c._id,
                }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              label="Precio"
              name="unitPrice"
              rules={[{ required: true, message: "Precio requerido" }]}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Stock"
              name="stock"
              rules={[{ required: true, message: "Stock requerido" }]}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Min. stock" name="minStock">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={18}>
            <Form.Item label="Imagen URL (opcional)" name="imageUrl">
              <Input placeholder="https://..." />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Activo" name="active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Text type="secondary" style={{ fontSize: 12 }}>
          Si algo falla, usa “Ver detalles” en el mensaje de error para
          compartirlo con soporte.
        </Text>
      </Form>
    </Modal>
  );
}

export default ProductModal;
