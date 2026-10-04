/**
 * HTTP utilities (Hermes-safe: no URL/URLSearchParams globals).
 */

export const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
    'Connection': 'keep-alive',
};

/**
 * Fetch a URL and return the response body as text.
 * @param {string} url
 * @param {object} options { headers, method, body }
 */
export async function fetchText(url, options = {}) {
    const res = await fetch(url, {
        method: options.method || 'GET',
        headers: Object.assign({}, DEFAULT_HEADERS, options.headers || {}),
        body: options.body,
    });
    if (!res.ok) {
        throw new Error('HTTP ' + res.status + ' for ' + url);
    }
    return await res.text();
}
