import { useState } from "react";
import { useNavigate } from "react-router-dom";

const LoginPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="login-page">
      {/* Background */}
      <div className="login-bg">
        <img
          src="https://placehold.co/1920x1080/003b41/006971?text=Hoteles+Frida"
          alt="Hoteles Frida"
        />
      </div>

      <main className="login-main">
        <div className="login-grid">
          {/* Editorial left column */}
          <div className="login-editorial">
            <div className="login-editorial__badge">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "12px" }}
              >
                auto_awesome
              </span>
              Panel de gestión
            </div>
            <h2 className="login-editorial__title">
              Bienvenido al
              <br />
              <em>Centro de</em>
              <br />
              Operaciones
            </h2>
            <p className="login-editorial__sub">
              Gestiona reservas, habitaciones, huéspedes y más desde un único
              panel diseñado para la hospitalidad de lujo.
            </p>
          </div>

          {/* Login card */}
          <div className="login-card">
            <h1 className="login-card__title">Acceder</h1>
            <div className="login-card__sub">
              Panel administrativo · Hoteles Frida
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-form__field">
                <label className="login-form__label">Correo electrónico</label>
                <input
                  type="email"
                  className="ghost-input"
                  placeholder="tu@hotelesfrida.mx"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="login-form__field">
                <div className="login-form__label-row">
                  <label className="login-form__label">Contraseña</label>
                  <span className="login-form__forgot">
                    ¿Olvidaste tu contraseña?
                  </span>
                </div>
                <input
                  type="password"
                  className="ghost-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="login-submit">
                Acceder al Panel
              </button>
            </form>

            <div
              className="login-alt-btns"
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <button
                className="login-alt-btn"
                type="button"
                onClick={() => navigate("/")} // Navegación programática
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "14px" }}
                >
                  home
                </span>
                Ir a inicio
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
