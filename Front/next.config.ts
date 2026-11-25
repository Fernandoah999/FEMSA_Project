import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  output: process.env.FEMSA_STANDALONE === "1" ? "standalone" : undefined,
};
export default config;
