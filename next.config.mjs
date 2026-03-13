/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY ||
      process.env.GOOGLE_BOOKS_API_KEY ||
      '',
  },
  images: {
    unoptimized: true,
  },
};
export default nextConfig;
