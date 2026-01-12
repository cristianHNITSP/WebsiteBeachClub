// src/components/CheckSession.jsx
import { useEffect, useRef, useState } from "react";
import { Result, Spin, Button, Space } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { getOnce, getAuthReason } from "@api/axios";

const SESSION_ENDPOINT = "/api/auth/me";

const CheckSession = ({
  redirectTo = "/panel.web/login.panel.web",
  onValid,
}) => {
  const [state, setState] = useState({ status: "checking" }); // checking | ok | error
  const mountedRef = useRef(true);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      try {
        await getOnce(SESSION_ENDPOINT, { withCredentials: true });
        if (!mountedRef.current) return;

        setState({ status: "ok" });
        if (typeof onValid === "function") onValid();

        const from = location?.state?.from;
        if (from) navigate(from, { replace: true });
      } catch (err) {
        if (!mountedRef.current) return;

        const reason = getAuthReason(err);

        // ✅ Solo si realmente expiró el token
        if (reason === "expired") {
          try {
            window.sessionStorage.setItem("hb_session_expired", "1");
          } catch {}

          navigate(redirectTo, {
            replace: true,
            state: { reason: "expired", from: location.pathname },
          });
          return;
        }

        // ✅ Si está signed_out (logout / sin cookie / token revocado), NO digas "expiró"
        if (reason === "signed_out") {
          navigate(redirectTo, {
            replace: true,
            state: { reason: "signed_out", from: location.pathname },
          });
          return;
        }

        setState({ status: "error" });
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [navigate, redirectTo, location, onValid]);

  if (state.status === "checking") {
    return (
      <Result
        icon={<Spin size="large" />}
        title="Verificando tu sesión…"
        subTitle="Por favor espera un momento mientras validamos tu acceso al panel."
      />
    );
  }

  if (state.status === "error") {
    return (
      <Result
        status="error"
        title="No pudimos validar tu sesión"
        subTitle="Intenta nuevamente. Si el problema persiste, contacta al administrador."
        extra={
          <Space>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
            <Button
              type="primary"
              onClick={() => navigate(redirectTo, { replace: true })}
            >
              Ir a iniciar sesión
            </Button>
          </Space>
        }
      />
    );
  }

  // ok normalmente ya redirigió o dejó pasar
  return null;
};

export default CheckSession;
