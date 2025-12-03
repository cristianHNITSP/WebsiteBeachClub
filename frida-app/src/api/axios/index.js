import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE || "";

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

const DEBUG_RESERVAS = String(import.meta.env.VITE_DEBUG_RESERVAS) === "true";

if (DEBUG_RESERVAS) {
  axiosInstance.interceptors.request.use((config) => {
    const reqId = Math.random().toString(16).slice(2);
    config.headers = config.headers || {};
    config.headers["x-debug-reqid"] = reqId;
    config.metadata = { reqId, t0: performance.now() };

    console.groupCollapsed(`%c[HTTP ->] ${String(config.method).toUpperCase()} ${config.url}`, "color:#2563eb;font-weight:600");
    console.log("reqId:", reqId);
    console.log("params:", config.params);
    console.log("data:", config.data);
    console.log("headers:", config.headers);
    console.groupEnd();

    return config;
  });

  axiosInstance.interceptors.response.use(
    (res) => {
      const md = res.config.metadata || {};
      const ms = md.t0 ? Math.round(performance.now() - md.t0) : "?";
      console.groupCollapsed(`%c[HTTP <-] ${res.status} ${res.config.url} (${ms}ms)`, "color:#16a34a;font-weight:600");
      console.log("reqId:", md.reqId);
      console.log("data:", res.data);
      console.groupEnd();
      return res;
    },
    (err) => {
      const cfg = err.config || {};
      const md = cfg.metadata || {};
      const ms = md.t0 ? Math.round(performance.now() - md.t0) : "?";
      console.groupCollapsed(`%c[HTTP !!] ${(cfg.method || "??").toUpperCase()} ${cfg.url} (${ms}ms)`, "color:#dc2626;font-weight:600");
      console.log("reqId:", md.reqId);
      console.log("status:", err?.response?.status);
      console.log("response:", err?.response?.data);
      console.log("message:", err?.message);
      console.groupEnd();
      return Promise.reject(err);
    }
  );
}

export default axiosInstance;
export { axiosInstance };
