import { useState } from "react";
import { Modal, Button, Space, Typography, Divider, Alert } from "antd";

const { Text } = Typography;

const ConfigModal = ({ open, onClose }) => {
  return (
    <Modal
      open={open}
      title="Configuración"
      onCancel={onClose}
      footer={null}
      width={680}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        Aquí puedes ajustar la configuración de la aplicación.
        <Divider />
        <Alert
          message="Esta es una demo de configuración. Las opciones reales se implementarán en el futuro."
          type="info"
        />
        <Space style={{ marginTop: 16 }}>
          <Button type="primary" onClick={onClose}>
            Cerrar
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default ConfigModal;
