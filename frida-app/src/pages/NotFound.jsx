import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";

const App = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="Lo sentimos, la página que acabas de visitar no existe."
      extra={
        <Button type="primary" onClick={() => navigate("/")}>
          Ir al inicio
        </Button>
      }
    />
  );
};

export default App;
