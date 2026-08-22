/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hostnames allowed to hit the dev server (LocalTunnel for phone testing)
  allowedDevOrigins: ["*.loca.lt", "localhost"],
};

export default nextConfig;
