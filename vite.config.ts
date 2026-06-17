import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps asset paths relative so the built app works from any
// static host or sub-path (and even when opened directly from disk).
export default defineConfig({
  base: "./",
  plugins: [react()],
});
