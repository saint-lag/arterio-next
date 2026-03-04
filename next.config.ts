import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {

    const wpUrl = process.env.NEXT_PUBLIC_WP_URL;

    return [
      {
        // Tudo que você chamar para /api/wp/ vai ser redirecionado no backend para o WordPress
        source: '/api/wp/:path*',
        destination: `${wpUrl}/wp-json/:path*`, // URL do seu WP
      },
    ];
  },
};

export default nextConfig;