import { defineConfig } from "vite";
import compress from "vite-plugin-compression";

export default defineConfig({
  base: "/starter_vr/",
  plugins: [
    compress(),
  ],
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
        },
      },
    },
  },
});
