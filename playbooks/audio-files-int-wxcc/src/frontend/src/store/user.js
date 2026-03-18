import { create } from "zustand"

export const useUserStore = create((set) => ({
    user: [],
    setUser: (user) => set({ user }),
    createUser: async (code) => {
        if (!code) {
            return { success: false, message: "please include code." };
        }

        const payload = {
            code : code
        }

        const res = await fetch("/api/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        console.log("data", data);
        if (!data.success) {
            return {success: false, message: "Error when creating user." }
        }
        set((state) => ({ user: [data.data]}));
        return {success: true, message: "user created or logged." };
    }
}));