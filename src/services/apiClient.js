import { apiEndpoint } from "../config/env";
import { normalizeUser } from "../utils/backendAdapters";
import { expireSession } from "../utils/sessionExpiry";

async function request(path, { method = "GET", token, body, expireOnUnauthorized = true } = {}) {
  const response = await fetch(apiEndpoint(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let payload = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  }

  if (!response.ok) {
    if (response.status === 401 && expireOnUnauthorized) {
      expireSession();
    }
    const error = new Error(
      payload?.error ?? payload?.message ?? `Request failed with status ${response.status}`
    );
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  return payload;
}

export const authApi = {
  guest: async (username) => {
    const payload = await request("/auth/guest", { method: "POST", body: { username } });
    return { ...payload, user: normalizeUser(payload?.user) };
  },
  login: async (credentials) => {
    const payload = await request("/auth/login", { method: "POST", body: credentials });
    return { ...payload, user: normalizeUser(payload?.user) };
  },
  register: async ({ username, email, password }) => {
    const payload = await request("/auth/register", {
      method: "POST",
      body: { username, email, password }
    });
    return { ...payload, user: normalizeUser(payload?.user) };
  },
  me: async (token) => {
    const payload = await request("/auth/me", { token });
    return { ...payload, user: normalizeUser(payload?.user) };
  },
  logout: (token) => request("/auth/logout", { method: "POST", token })
};

export const roomsApi = {
  listWaiting: () => request("/rooms"),
  getById: (roomId) => request(`/rooms/${roomId}`)
};

export const leaderboardApi = {
  list: ({ page = 1, limit = 20 } = {}) => request(`/leaderboard?page=${page}&limit=${limit}`)
};

export const historyApi = {
  listByUser: ({ userId, token, page = 1, limit = 10 }) =>
    request(`/history/${userId}?page=${page}&limit=${limit}`, {
      token,
      expireOnUnauthorized: false
    }),
  getGame: ({ historyId, token }) =>
    request(`/history/game/${historyId}`, {
      token,
      expireOnUnauthorized: false
    })
};

export const wordApi = {
  validateWord: ({ word, letter }) => request("/validate-word", { method: "POST", body: { word, letter } })
};
