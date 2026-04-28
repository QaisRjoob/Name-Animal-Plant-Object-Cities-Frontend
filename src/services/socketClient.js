import { io } from "socket.io-client";
import { SOCKET_URL } from "../config/env";

let socket = null;

export function connectSocket(token) {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      transports: ["websocket"],
      auth: { token }
    });
  } else {
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}

export function emitSocketEvent(event, payload) {
  const activeSocket = getSocket();
  if (!activeSocket || !activeSocket.connected) {
    throw new Error("Socket is not connected.");
  }
  console.log("[SocketClient] emit", {
    event,
    payload,
    connected: activeSocket.connected,
    socketId: activeSocket.id,
    timestamp: new Date().toISOString()
  });
  activeSocket.emit(event, payload);
}
