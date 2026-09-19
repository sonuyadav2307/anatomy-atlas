import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@cloudflare/**",
      "node_modules/@playwright/**",
      "node_modules/playwright/**",
      "node_modules/playwright-core/**",
      "node_modules/vinext/**",
      "node_modules/vite/**",
      "node_modules/wrangler/**",
      "public/models/**",
    ],
  },
};

export default nextConfig;
