import { useEffect } from "react";
import { Modal, Form, Input } from "antd";

// genera "cabanas-frida" desde "Cabañas Frida"
const slugify = (str) => {
  return String(str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/&/g, " y ")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const SedeUpsertModal = ({ open, mode, sede, saving, onCancel, onSubmit }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && sede) {
      form.setFieldsValue({
        name: sede.name || "",
        description: sede.description || "",
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ name: "", description: "" });
    }
  }, [open, mode, sede, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    const name = String(values.name || "").trim();
    const description = String(values.description || "").trim();

    if (mode === "create") {
      // ✅ key autogenerada (no visible)
      const key = slugify(name);

      return onSubmit({
        key,
        name,
        description,
      });
    }

    // ✅ edit: NO tocamos key
    return onSubmit({
      name,
      description,
    });
  };

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Nueva sede" : "Editar sede"}
      onOk={handleOk}
      confirmLoading={saving}
      onCancel={onCancel}
      okText={mode === "create" ? "Crear" : "Guardar"}
      cancelText="Cancelar"
      centered
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Nombre visible"
          name="name"
          rules={[
            { required: true, message: "El nombre es obligatorio" },
            { min: 3, message: "Mínimo 3 caracteres" },
          ]}
        >
          <Input placeholder="Ej: Casa Frida" />
        </Form.Item>

        <Form.Item label="Descripción" name="description">
          <Input.TextArea rows={3} placeholder="Opcional" />
        </Form.Item>


      </Form>
    </Modal>
  );
};

export default SedeUpsertModal;
