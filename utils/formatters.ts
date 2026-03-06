export const decodeHTMLEntities = (text: string): string => {
    if (!text) return "";

    return text.replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&rsquo;/g, '’')
        .replace(/&#8211;/g, '–')
        .replace(/&#8212;/g, '—')
        .replace(/&#8217;/g, '’')
        .replace(/&#8220;/g, '“')
        .replace(/&#8221;/g, '”')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")

}
/**
 * Formata um valor numérico como moeda BRL (R$).
 * Ex: formatCurrency(129.9) → "R$ 129,90"
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Formata uma data ISO 8601 para formato legível pt-BR.
 * Ex: formatDate("2025-12-01T10:30:00") → "01 de dezembro de 2025"
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}