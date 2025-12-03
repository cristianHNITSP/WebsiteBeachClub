import { io } from "socket.io-client";

let socket = null;

export function initSocket(url) {
  if (socket) return socket;

  const target = url || import.meta.env.VITE_RESERVAS_WS_URL || undefined;

  socket = io(target, {
    transports: ["websocket"],
    withCredentials: true,
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  try {
    socket.disconnect();
  } catch (e) {
    // ignore
  }
  socket = null;
}
