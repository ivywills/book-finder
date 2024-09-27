/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  env: {
    openAPI: process.env.OPEN_API_KEY,
    CLERK_FRONTEND_API: 'your-clerk-frontend-api',
    CLERK_API_KEY: 'your-clerk-api-key',
    CLERK_SECRET_KEY: 'sk_test_dGIkJUGwbJ8cKrVoWEGVaEdhtHc5bNnb7Bz8571Qz94',
  },
};
export default nextConfig;
