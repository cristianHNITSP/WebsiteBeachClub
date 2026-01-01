import { Modal, Form, Input, Select } from "antd";

const EMAIL_DOMAIN = "beachclub.com";

const UsuarioEditModal = ({
  modalVisible,
  guardarUsuario,
  savingUser,
  cerrarModal,
  form,
  initialValues,
  editingUserId,

  sedeOptions = [],
  sedesLoading = false,
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
      destroyOnHidden
    >
      <Form
        key={editingUserId || "no-user"}
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
          rules={[{ required: true, message: "Ingresa el usuario corporativo" }]}
        >
          <Input placeholder="ej: laura.sanchez" addonAfter={`@${EMAIL_DOMAIN}`} />
        </Form.Item>

        <Form.Item
          label="Sede"
          name="sedeId"
          rules={[{ required: true, message: "Selecciona la sede" }]}
        >
          <Select
            placeholder="Selecciona la sede"
            loading={sedesLoading}
            options={sedeOptions}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item
          label="Tipo de acceso"
          name="role"
          rules={[{ required: true, message: "Selecciona el tipo de acceso" }]}
        >
          <Select
            placeholder="Selecciona una opción"
            options={[
              { value: "administrador", label: "Administrador" },
              { value: "staff", label: "Staff" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UsuarioEditModal;
