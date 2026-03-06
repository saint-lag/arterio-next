import type { TrackingItem } from '@/app/types/account';

/**
 * Providers de rastreio e seus patterns de URL.
 * O placeholder {code} será substituído pelo código informado.
 */
const TRACKING_URLS: Record<string, string> = {
  correios:
    'https://rastreamento.correios.com.br/app/index.php?objeto={code}',
  jadlog:
    'https://www.jadlog.com.br/siteInstitucional/tracking.jad?cte={code}',
  loggi: 'https://www.loggi.com/rastreio/{code}',
};

function buildTrackingLink(provider: string, code: string): string {
  const key = provider.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const template = TRACKING_URLS[key];
  return template ? template.replace('{code}', encodeURIComponent(code)) : '';
}

/**
 * Extrai dados de rastreio do meta_data de um pedido WooCommerce.
 *
 * Suporta:
 * - Plugin "Advanced Shipment Tracking" (key `_wc_shipment_tracking_items`)
 * - Meta simples `_tracking_number` / `_tracking_provider`
 *
 * Retorna o pedido original acrescido do campo `tracking: TrackingItem[]`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractTracking<T extends Record<string, any>>(order: T): T & { tracking: TrackingItem[] } {
  const meta: Array<{ key: string; value: unknown }> = order.meta_data ?? [];
  const tracking: TrackingItem[] = [];

  // 1. Plugin AST — array em _wc_shipment_tracking_items
  const astMeta = meta.find((m) => m.key === '_wc_shipment_tracking_items');
  if (astMeta && Array.isArray(astMeta.value)) {
    for (const item of astMeta.value) {
      if (!item?.tracking_number) continue;
      tracking.push({
        tracking_provider: item.tracking_provider ?? '',
        tracking_number: item.tracking_number,
        tracking_link: item.tracking_link || buildTrackingLink(item.tracking_provider ?? '', item.tracking_number),
        date_shipped: item.date_shipped ?? undefined,
      });
    }
  }

  // 2. Fallback: meta simples (_tracking_number + _tracking_provider)
  if (tracking.length === 0) {
    const numberMeta = meta.find((m) => m.key === '_tracking_number');
    const providerMeta = meta.find((m) => m.key === '_tracking_provider');

    if (numberMeta && typeof numberMeta.value === 'string' && numberMeta.value) {
      const provider = typeof providerMeta?.value === 'string' ? providerMeta.value : '';
      tracking.push({
        tracking_provider: provider,
        tracking_number: numberMeta.value,
        tracking_link: buildTrackingLink(provider, numberMeta.value),
      });
    }
  }

  return { ...order, tracking };
}
