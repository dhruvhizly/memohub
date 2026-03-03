/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '', // Leave empty or specify your port (e.g., '3000')
        pathname: '/**', // Allows all image paths
      },
    ],
  },
};

module.exports = nextConfig;
