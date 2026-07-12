import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_SHA: process.env.COMMIT_REF?.slice(0, 7) ?? "dev",
  },
};

export default nextConfig;
