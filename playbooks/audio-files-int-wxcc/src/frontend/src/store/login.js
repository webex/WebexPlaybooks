import { create } from "zustand"

export const useLoginStore = create((set) => ({
  isLoggedIn: false,  // Initial state for logged-in status
  // Action to log the user in
  login: () => set({ isLoggedIn: true }),
  // Action to log the user out
  logout: () => set({ isLoggedIn: false }),
}));
