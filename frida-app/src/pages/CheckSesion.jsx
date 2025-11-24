// src/components/CheckSession.jsx
import { Result, Spin } from "antd";

const CheckSession = () => {
  return (
    <Result
      icon={<Spin size="large" />}
      title="Verificando tu sesión..."
      subTitle="Por favor espera un momento mientras validamos tu acceso al panel."
    />
  );
};

export default CheckSession;
