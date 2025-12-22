import { useEffect } from "react";
import { Modal, Form, Input, Select } from "antd";

const { Option } = Select;
const EMAIL_DOMAIN = "beachclub.com";

const UsuarioEditModal = ({
  modalVisible,
  guardarUsuario,
  savingUser,
  cerrarModal,
  form,
  initialValues,
  editingUserId,
}) => {
  useEffect(() => {
    console.log("[UsuarioEditModal] props:", {
      modalVisible,
      initialValues,
      editingUserId,
    });
  }, [modalVisible, initialValues, editingUserId]);

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
      destroyOnHidden
    >
      <Form
        key={editingUserId || "no-user"} // 🔑 fuerza remount cuando cambia el usuario
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={initialValues || {}}
      >
        <Form.Item
          label="Nombre completo"
          name="name"
          rules={[{ required: true, message: "Ingresa el nombre completo" }]}
        >
          <Input placeholder="Ej: Juan Pérez" />
        </Form.Item>

        <Form.Item
          label="Usuario corporativo"
          name="emailUser"
          tooltip={`El correo final será usuario@${EMAIL_DOMAIN}`}
          rules={[
            { required: true, message: "Ingresa el usuario corporativo" },
          ]}
        >
          <Input
            placeholder="ej: laura.sanchez"
            addonAfter={`@${EMAIL_DOMAIN}`}
          />
        </Form.Item>

        <Form.Item
          label="Sede"
          name="sede"
          rules={[{ required: true, message: "Selecciona la sede" }]}
        >
          <Select placeholder="Selecciona la sede">
            <Option value="casa-frida">Casa Frida</Option>
            <Option value="cabanas-frida">Cabañas Frida</Option>
          </Select>
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
