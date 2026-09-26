import type { NextConfig } from "next";

// No `output: "standalone"` — that's for a Dockerfile deploy running
// `node .next/standalone/server.js`. Render (render.yaml) runs `npm start`
// (`next start`), which warns and ignores standalone output if set (caught
// via a real `npm start` run, not assumed).
const nextConfig: NextConfig = {};

export default nextConfig;
