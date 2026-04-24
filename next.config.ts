import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Avoid Next picking an unrelated parent lockfile as the tracing root on Windows setups
  // where multiple package-lock.json files exist (e.g. under the user profile).
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
