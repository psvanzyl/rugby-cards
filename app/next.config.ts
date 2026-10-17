import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output: the Coolify image only ships the server bundle + static assets.
  output: "standalone",

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  async headers() {
    return [
      {
        // The catalogue is the whole dataset; let the browser keep it for a day.
        source: "/data/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
};

export default nextConfig;
