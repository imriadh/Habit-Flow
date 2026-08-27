import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// HabitFlow frontend — React + pure CSS (no CSS framework).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
