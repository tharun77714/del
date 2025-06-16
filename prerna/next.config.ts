import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.istockphoto.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'imgs.search.brave.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@mediapipe/camera_utils': false,
        '@mediapipe/face_mesh': false,
        '@tensorflow/tfjs': false,
      };

      // Optionally, you might still need externals for some cases, but alias is more direct for 'module not found'
      config.externals.push(
        // @ts-ignore
        '@mediapipe/camera_utils',
        // @ts-ignore
        '@mediapipe/face_mesh',
        // @ts-ignore
        '@tensorflow/tfjs'
      );
    }
    return config;
  },
};

export default nextConfig;
