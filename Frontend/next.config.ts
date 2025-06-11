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
                protocol: "http",
                hostname: "localhost",
                port: "3000",
                pathname: "/**"
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
    },
    typescript: {
        ignoreBuildErrors: true
    },
    // Disable Pages Router for src/pages directory
    // Use a non-existent extension to prevent files from being recognized as pages
/*    pageExtensions: ['page.tsx', 'page.ts', 'page.jsx', 'page.js'],*/
    /* config options here */
};

export default nextConfig;
