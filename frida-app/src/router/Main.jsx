import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '../App';
import PanelAdmin from '../pages/PanelAdminWeb';
import IniciarSesion from '../pages/InicioSesionPanel';
const RouterApp = () => {
  return (
    <Router>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* Grupo: /panel.web (sin elemento) */}
        <Route path="/panel.web">
          {/* /panel.web/panel.admin.web */}
          <Route path="panel.admin.web" element={<PanelAdmin />} />
            <Route path="login.panel.web" element={<IniciarSesion />} />
        </Route>

        {/* Login en raíz */}
      
      </Routes>
    </Router>
  );
};

export default RouterApp;
