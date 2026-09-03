import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "tesseract.js", "@napi-rs/canvas"],
  // pdf-parse (via pdfjs-dist) loads its worker file with a runtime import.meta.url
  // path Next.js's file tracing can't statically follow, so the worker is missing
  // from the deployed serverless bundle unless explicitly included here.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
};

export default nextConfig;
