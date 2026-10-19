import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.API_PORT ?? 3556}`,
        changeOrigin: false,
      },
    },
  },
});
