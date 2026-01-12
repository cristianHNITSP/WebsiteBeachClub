import React from "react";
import { Modal, Form, Input, Select, Typography } from "antd";

const { Text } = Typography;

function CategoryModal({ open, editingCategory, form, onCancel, onOk }) {
  return (
    <Modal
      title={editingCategory ? "Editar categoría" : "Nueva categoría"}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText={editingCategory ? "Guardar" : "Crear"}
      cancelText="Cancelar"
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Sección"
          name="section"
          rules={[{ required: true, message: "Selecciona una sección" }]}
        >
          <Select
            options={[
              { label: "Normal", value: "normal" },
              { label: "Alcohol", value: "alcohol" },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Nombre"
          name="name"
          rules={[
            { required: true, message: "Escribe el nombre" },
            { min: 2, message: "Mínimo 2 caracteres" },
          ]}
        >
          <Input placeholder="Ej: Bebidas" />
        </Form.Item>

        <Text type="secondary" style={{ fontSize: 12 }}>
          Tip: el botón ⋯ en la etiqueta te deja editar o enviar a papelera.
        </Text>
      </Form>
    </Modal>
  );
}

export default CategoryModal;
