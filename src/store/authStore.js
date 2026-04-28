import { create } from "zustand";

if (typeof window !== "undefined") {
  window.localStorage.removeItem("napoc-auth");
}

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  isHydrated: true,
  setSession: ({ token, user }) => set({ token, user }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ token: null, user: null }),
  setHydrated: () => {}
}));
