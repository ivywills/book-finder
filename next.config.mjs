/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  output: 'export',
  env: {
    openAPI: process.env.OPEN_API_KEY,
  },
};
export default nextConfig;
