import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite abrir el dev server desde 127.0.0.1
  allowedDevOrigins: ['127.0.0.1'],
  
  // Desactiva la generación de source maps en producción para mayor privacidad y ligereza
  productionBrowserSourceMaps: false,
  
  // Habilita compresión Gzip / Brotli integrada
  compress: true,
  
  // Optimización estricta de headers y generación limpia de assets
  poweredByHeader: false,
  
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
