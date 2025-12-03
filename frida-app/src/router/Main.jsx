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
 * - Si viene en location.state, lo usa.
 * - Si no, intenta hacer /api/auth/me para ver si hay sesión.
 * - Si no hay sesión, simplemente renderiza <Home /> sin usuario.
 */
function PublicHomeRoute() {
  const location = useLocation();
  const userFromNav = location.state?.currentUser || null;

  const [currentUser, setCurrentUser] = useState(userFromNav);
  const [checkedSession, setCheckedSession] = useState(
    !!userFromNav // si ya vino desde el panel, no necesitamos checar
  );

  useEffect(() => {
    // Si ya traemos usuario desde el panel, no llamamos a /me
    if (userFromNav) return;

    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data } = await axios.get("/api/auth/me");
        if (!isMounted) return;
        setCurrentUser(data);
      } catch (err) {
        // sin sesión, simplemente dejamos currentUser en null
      } finally {
        if (isMounted) setCheckedSession(true);
      }
    };

    checkSession();
    return () => {
      isMounted = false;
    };
  }, [userFromNav]);

  // Podemos mostrar el Home incluso mientras se revisa sesión;
  // currentUser será null hasta que se resuelva.
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
        const { data } = await axios.get("/api/auth/me"); // aquí viene tu user
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

  if (status === "checking") {
    return <CheckSesion />;
  }

  if (status === "denied") {
    return <Navigate to="/panel.web/login.panel.web" replace />;
  }

  // Aquí ya tenemos sesión válida y un usuario
  return <Component currentUser={currentUser} />;
}

/**
 * Ruta de Login:
 * - Si NO hay sesión -> muestra el formulario de login.
 * - Si SÍ hay sesión -> redirige directo al panel admin.
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

  // Invitado -> mostrar login
  return <InicioSesionPanel />;
}

const RouterApp = () => {
  return (
    <Router basename="/hotelesfrida.app">
      <Routes>
        {/* Home público, usando PublicHomeRoute */}
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

        {/* Fallback: cualquier ruta desconocida -> NotFound */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default RouterApp;
