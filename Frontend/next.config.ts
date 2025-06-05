import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'ui-avatars.com',
                    pathname: '/api/**',
            },
            {
                protocol: 'https',
                hostname: 'localhost',
                port: '7245',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'img.youtube.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'i.vimeocdn.com',
                pathname: '/**',
            }
        ],
    }
  /* config options here */
};

export default nextConfig;
