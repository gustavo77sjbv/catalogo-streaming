import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // O CDN do TMDB já entrega tamanhos prontos (w342, w92). Otimizar de novo na Vercel
    // esgotaria a cota gratuita com centenas de pôsteres.
    unoptimized: true,
  },
};

export default nextConfig;
