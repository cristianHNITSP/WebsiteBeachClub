// src/components/usuarios/UsuarioEditModal.jsx
import { Modal, Form, Input, Select } from "antd";

const { Option } = Select;

const UsuarioEditModal = ({
  modalVisible,
  guardarUsuario,
  savingUser,
  cerrarModal,
  form,
}) => {
  return (
    <Modal
      open={modalVisible}
      title="Editar usuario"
      onOk={guardarUsuario}
      confirmLoading={savingUser}
      onCancel={cerrarModal}
      okText="Guardar cambios"
      cancelText="Cancelar"
      centered
      // destroyOnClose  ❌ deprecated -> destroyOnHidden ✅ :contentReference[oaicite:1]{index=1}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          label="Nombre completo"
          name="name"
          rules={[{ required: true, message: "Ingresa el nombre completo" }]}
        >
          <Input placeholder="Ej: Juan Pérez" />
        </Form.Item>

        <Form.Item
          label="Correo"
          name="email"
          rules={[
            { required: true, message: "Ingresa el correo" },
            { type: "email", message: "Correo no válido" },
          ]}
        >
          <Input placeholder="nombre@hotel.com" />
        </Form.Item>

        <Form.Item
          label="Tipo de acceso"
          name="role"
          rules={[{ required: true, message: "Selecciona el tipo de acceso" }]}
        >
          <Select placeholder="Selecciona una opción">
            <Option value="administrador">Administrador</Option>
            <Option value="staff">Staff</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UsuarioEditModal;
