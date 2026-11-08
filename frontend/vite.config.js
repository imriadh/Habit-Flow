import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// HabitFlow frontend — React + pure CSS (no CSS framework).
// base "./" keeps every asset URL relative, so the built app works from any
// static host or subfolder (e.g. riad.iam.bd/habitflow-demo/) without changes.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5173,
  },
});
