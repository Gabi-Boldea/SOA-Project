import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "mf_tasks",
      filename: "remoteEntry.js",
      exposes: {
        "./TasksWidget": "./src/TasksWidget.jsx",
      },
      shared: ["react", "react-dom"],
    }),
  ],
  server: { port: 5174, cors: true },
  build: { target: "esnext" },
});
