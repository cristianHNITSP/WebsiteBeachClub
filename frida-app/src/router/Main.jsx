// src/router/RouterApp.jsx
import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import axios from "@api/axios";

import Home from "../App";
import PanelAdmin from "../pages/PanelAdminWeb";
import InicioSesionPanel from "../pages/InicioSesionPanel";
import CheckSesion from "../pages/CheckSesion";
import NotFound from "../pages/NotFound";

// Siempre manda cookies (auth_token) en las peticiones
axios.defaults.withCredentials = true;

/**
 * Ruta pública "/" que opcionalmente recibe currentUser
 */
function PublicHomeRoute() {
  const location = useLocation();
  const userFromNav = location.state?.currentUser || null;

  const [currentUser, setCurrentUser] = useState(userFromNav);
  const [checkedSession, setCheckedSession] = useState(!!userFromNav);

  useEffect(() => {
    if (userFromNav) return;

    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data } = await axios.get("/api/auth/me");
        if (!isMounted) return;
        setCurrentUser(data);
      } catch (err) {
        // sin sesión, currentUser se queda en null
      } finally {
        if (isMounted) setCheckedSession(true);
      }
    };

    checkSession();
    return () => {
      isMounted = false;
    };
  }, [userFromNav]);

  return <Home currentUser={currentUser} />;
}

/**
 * Protege rutas que solo puede ver alguien con sesión válida.
 * Además de validar, obtiene el usuario y se lo pasa al componente como prop.
 */
function ProtectedPanelRoute({ component: Component }) {
  const [status, setStatus] = useState("checking"); // 'checking' | 'allowed' | 'denied'
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data } = await axios.get("/api/auth/me"); // aquí viene tu user completo
        if (!isMounted) return;
        setCurrentUser(data);
        setStatus("allowed");
      } catch (err) {
        if (!isMounted) return;
        setStatus("denied");
      }
    };

    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 👇 función que usará el header/config para actualizar el usuario en caliente
  const handleCurrentUserUpdated = (patchedUser) => {
    setCurrentUser((prev) => {
      if (!prev) return patchedUser;

      return {
        ...prev,
        ...patchedUser,
        // SI el backend no manda permissions en /api/users/me,
        // conservamos los existentes
        permissions:
          patchedUser.permissions !== undefined
            ? patchedUser.permissions
            : prev.permissions,
        role:
          patchedUser.role !== undefined ? patchedUser.role : prev.role,
      };
    });
  };

  if (status === "checking") {
    return <CheckSesion />;
  }

  if (status === "denied") {
    return <Navigate to="/panel.web/login.panel.web" replace />;
  }

  // Aquí ya tenemos sesión válida y un usuario
  return (
    <Component
      currentUser={currentUser}
      onCurrentUserUpdated={handleCurrentUserUpdated}
    />
  );
}

/**
 * Ruta de Login
 */
function LoginRoute() {
  const [status, setStatus] = useState("checking"); // 'checking' | 'guest' | 'logged'

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        await axios.get("/api/auth/me");
        if (isMounted) setStatus("logged");
      } catch (err) {
        if (isMounted) setStatus("guest");
      }
    };

    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  if (status === "checking") {
    return <CheckSesion />;
  }

  if (status === "logged") {
    return <Navigate to="/panel.web/panel.admin.web" replace />;
  }

  return <InicioSesionPanel />;
}

const RouterApp = () => {
  return (
    <Router basename="/hotelesfrida.app">
      <Routes>
        {/* Home público */}
        <Route path="/" element={<PublicHomeRoute />} />

        {/* Grupo: /panel.web */}
        <Route path="/panel.web">
          {/* Login del panel */}
          <Route path="login.panel.web" element={<LoginRoute />} />

          {/* Panel admin protegido */}
          <Route
            path="panel.admin.web"
            element={<ProtectedPanelRoute component={PanelAdmin} />}
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default RouterApp;
