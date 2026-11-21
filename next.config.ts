import type { NextConfig } from "next";

// As fotos das guias são enviadas por server actions: sobe o limite (por omissão 1 MB).
const experimental: Record<string, unknown> = { serverActions: { bodySizeLimit: "6mb" } };

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pg"],
  experimental: experimental as NextConfig["experimental"],
};

export default nextConfig;
