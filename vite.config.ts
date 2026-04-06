import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({ babel: { plugins: [["babel-plugin-react-compiler"]] } })],
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    host: "0.0.0.0",
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
