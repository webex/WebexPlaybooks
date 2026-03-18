import { create } from "zustand"

export const useAudioFileStore = create((set) => ({
    audiofiles: [],
    uploadAudioFile: async (file, email) => {
        if (!file) {
            return { success: false, message: "Please include a file." };
        }

        try {
            // Create a FormData object to handle the file upload
            const formData = new FormData();
            formData.append("file", file);
            formData.append("filename", file.name);
            formData.append("email", email);

            // Send the file to the external Express server
            const res = await fetch("/api/audiofiles", {
                method: "POST",
                body: formData,  // Directly send the FormData
            });

            // Parse the response
            const data = await res.json();
            if (!data.success) {
                return { success: false, message: "Error when uploading audio files." };
            }
            console.log("upload data : ", data.data);
            //Update the Zustand state with the response data
            //set((state) => ({ audiofiles: [...state.audiofiles, data.data] }));
            return { success: true, message: "Audio Files Uploaded." };
        } catch (error) {
            return { success: false, message: "An error occurred during the upload." };
        }
    },
    deleteAudioFile: async (id, email) => {
        const queryParam = new URLSearchParams({
            email: email,
        });
        if (!id) {
            return { success: false, message: "Please include an id." };
        }
        try {
            const res = await fetch(`/api/audiofiles/${id}?${queryParam}`, {
                method: "DELETE",
            });

            const data = await res.json();
            if (!data.success) {
                return { success: false, message: "Error when deleting audio file." };
            }

            set((state) => ({ audiofiles: state.audiofiles.filter((file) => file._id !== id) }));
            return { success: true, message: "Audio File Deleted." };
        } catch (error) {
            return { success: false, message: "An error occurred during the deletion." };
        }
    },
    getAudioFile: async (id) => {
        if (!id) {
            return { success: false, message: "Please include an id." };
        }

        try {
            const res = await fetch(`/api/audiofiles/${id}`, {
                method: "GET",
            });

            const data = await res.json();
            if (!data.success) {
                return { success: false, message: "Error when getting audio file." };
            }

            //set((state) => ({ audiofiles: state.audiofiles.filter((file) => file._id !== id) }));
            return { success: true, message: "Audio File Retrieved." };
        } catch (error) {
            return { success: false, message: "An error occurred during the retrieval." };
        }
    },
    updateAudioFile: async (id, user, description) => {
        if (!id) {
            return { success: false, message: "Please include an id." };
        }

        try {
            const res = await fetch(`/api/audiofiles/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ user, description }),
            });

            const data = await res.json();
            if (!data.success) {
                return { success: false, message: "Error when updating audio file." };
            }

            //set((state) => ({ audiofiles: state.audiofiles.filter((file) => file._id !== id) }));
            return { success: true, message: "Audio File Updated." };
        } catch (error) {
            return { success: false, message: "An error occurred during the update." };
        }
    },
    listAudiofiles: async (email) => {
        const queryParam = new URLSearchParams({
            email: email,
        });
        const res = await fetch(`/api/audiofiles?${queryParam}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await res.json();
        if (!data.success) {
            return {success: false, message: "Error when listing audio files." }
        }
        set((state) => ({ audiofiles : data.data }));
        return {success: true, message: "Audio Files Retrieved." };
    },
}));