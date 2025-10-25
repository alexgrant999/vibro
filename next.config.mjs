/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Explicitly allow LocalTunnel HTTPS URLs during dev
    allowedDevOrigins: [
      "https://*.loca.lt",
      "https://localhost:3000",
      "http://localhost:3000",
    ],
  },
};

export default nextConfig;
