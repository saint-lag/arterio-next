// Configuração Limpa para WooCommerce Store API
const wpUrl = process.env.NEXT_PUBLIC_WP_URL;

export const WP_CONFIG = {
  siteUrl: wpUrl,
  // storeApiUrl: `${wpUrl}/wp-json/wc/store/v1`, <-- O ANTIGO
  storeApiUrl: '/api/wp/wc/store/v1', // <-- O NOVO (Aponta para o próprio Next.js)
  checkoutUrl: `${wpUrl}/checkout`,
};