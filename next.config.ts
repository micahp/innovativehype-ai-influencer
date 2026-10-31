import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: { "/api/creative-assignments/[id]/board": ["./assets/references/**/*.svg"] },
  serverExternalPackages: ["pg", "bullmq"],
};

export default nextConfig;
