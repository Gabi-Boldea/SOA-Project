import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "shell",
      remotes: {
  mf_tasks: "http://localhost:5174/assets/remoteEntry.js",
  mf_notifications: "http://localhost:5175/assets/remoteEntry.js",
},

      shared: ["react", "react-dom"],
    }),
  ],
  server: { port: 5173 },
  build: { target: "esnext" },
});
