import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep unpdf / pdf.js out of the bundler — it loads its own worker at runtime.
  serverExternalPackages: ["unpdf"],
  // Allow accessing the dev server from phones/other devices on the LAN.
  // (HMR + other /_next dev resources are cross-origin-blocked otherwise.)
  allowedDevOrigins: ["192.168.88.8", "192.168.88.*"],
};

export default nextConfig;
