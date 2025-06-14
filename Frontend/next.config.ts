import type { NextConfig } from "next";
import {RemotePattern} from "next/dist/shared/lib/image-config";

const getBackendUrlConfig = (): URL | RemotePattern | undefined => {
    if (!process.env.NEXT_PUBLIC_BACKEND_URL) return undefined;

    try {
        const url = new URL(process.env.NEXT_PUBLIC_BACKEND_URL);
        return {
            protocol: url.protocol.replace(':', ''),
            hostname: url.hostname,
            ...(url.port ? { port: url.port } : {}),
            pathname: '/**',
        } as URL;
    } catch (error) {
        console.error('Invalid NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
        return undefined;
    }
};

const backendConfig = getBackendUrlConfig();

const nextConfig: NextConfig = {
    output: 'standalone',
    async rewrites (){
        return [
            {
                source: '/images-proxy/:path*',
                destination: `${process.env.INTERNAL_BACKEND_URL}/:path*`,
            },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'ui-avatars.com',
                pathname: '/api/**',
            },
            ...(backendConfig ? [backendConfig] : []),
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
    eslint: {
        ignoreDuringBuilds: true
    },
  /* config options here */
};

export default nextConfig;
