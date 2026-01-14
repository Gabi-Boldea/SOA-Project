import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "mf_notifications",
      filename: "remoteEntry.js",
      exposes: {
        "./NotificationsWidget": "./src/NotificationsWidget.jsx",
      },
      shared: ["react", "react-dom"],
    }),
  ],
  server: { port: 5175, cors: true },
  build: { target: "esnext" },
});
