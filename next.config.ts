import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "tesseract.js", "@napi-rs/canvas"],
};

export default nextConfig;
