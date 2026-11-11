import type { NextConfig } from "next";

// Origins that may call Server Actions. In production the browser's Origin
// always matches the Host, so this list only matters for development tunnels,
// preview domains and reverse proxies. Add yours here or via ALLOWED_ORIGINS.
const extraOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const devOrigins = ["localhost", "127.0.0.1", "*.e2b.app", ...extraOrigins];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    // Only sent over HTTPS, ignored on plain HTTP (local dev).
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Lets the dev server serve assets when it is reached through a preview
  // proxy or tunnel instead of localhost.
  allowedDevOrigins: devOrigins,

  experimental: {
    serverActions: {
      // Wildcards are supported. `host:port` entries match the Origin header
      // exactly, which is why localhost includes its port.
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "*.e2b.app",
        ...extraOrigins,
      ],
    },
  },

  // NOTE: we deliberately do not send X-Frame-Options / frame-ancestors here so
  // the app can be embedded in previews and dashboards. If you do not need
  // that, add `frame-ancestors 'none'` to a Content-Security-Policy header —
  // see docs/SECURITY.md ("HTTP security headers").
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
