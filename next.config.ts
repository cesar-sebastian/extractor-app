import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // The Docker runtime copies `.next/standalone` and does not ship the toolchain.
  output: "standalone",
  serverExternalPackages: ["pino"],
};

export default nextConfig;
