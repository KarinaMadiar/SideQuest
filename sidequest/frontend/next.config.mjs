/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_OUTPUT_EXPORT === 'true' ? 'export' : undefined,
  trailingSlash: process.env.NEXT_OUTPUT_EXPORT === 'true',
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
