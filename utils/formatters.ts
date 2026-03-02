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