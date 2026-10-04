/**
 * Shared utilities (Hermes-safe: no matchAll/replaceAll/URL/eval/String.normalize).
 */
import cheerio from 'cheerio-without-node-native';

export const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
    'Connection': 'keep-alive',
};

/**
 * Fetch a URL and return the response body as text.
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

/** Parse HTML into a cheerio document. */
export function loadHtml(html) {
    return cheerio.load(html);
}

/** Resolve a possibly-relative URL against a base URL. */
export function fixUrl(url, base) {
    if (!url) return '';
    if (url.indexOf('http') === 0) return url;
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (url.indexOf('/') === 0) {
        const m = base.match(/^(https?:\/\/[^\/]+)/);
        return m ? m[1] + url : url;
    }
    return base.replace(/\/$/, '') + '/' + url;
}

const ACCENTS = [
    [/[àáâãäå]/g, 'a'], [/èéêë/g, 'e'], [/ìíîï/g, 'i'],
    [/òóôõö/g, 'o'], [/ùúûü/g, 'u'], [/ç/g, 'c'], [/ñ/g, 'n'],
];

/** Lowercase, de-accent and strip punctuation: used to compare titles. */
export function normalizeTitle(s) {
    if (!s) return '';
    let t = String(s).toLowerCase();
    for (let i = 0; i < ACCENTS.length; i++) {
        t = t.replace(ACCENTS[i][0], ACCENTS[i][1]);
    }
    t = t.replace(/&/g, ' and ');
    t = t.replace(/[^a-z0-9]+/g, ' ').trim();
    return t;
}

/**
 * Score a site search result against TMDB details (higher = better match).
 * Port of the matching heuristics used across doGior's site providers.
 */
export function scoreResult(result, details, wantTv) {
    const nTmdb = normalizeTitle(details.title);
    const nOrig = normalizeTitle(details.originalTitle);
    const nSite = normalizeTitle(result.title);
    if (!nSite) return -1;

    let score = -1;
    if (nSite === nTmdb || (nOrig && nSite === nOrig)) {
        score = 100;
    } else if (
        (nTmdb && nSite.indexOf(nTmdb) === 0) ||
        (nOrig && nSite.indexOf(nOrig) === 0) ||
        (nTmdb && nTmdb.indexOf(nSite) === 0)
    ) {
        score = 60;
    } else if (nSite.indexOf(nTmdb) !== -1 || (nOrig && nSite.indexOf(nOrig) !== -1)) {
        score = 40;
    } else {
        return -1;
    }

    const year = String(details.year || '');
    if (year) {
        if (result.text && result.text.indexOf(year) !== -1) score += 10;
        if (result.url && result.url.indexOf(year) !== -1) score += 5;
    }
    const isSeriesUrl = /serie[-_]tv/.test(result.url || '');
    if (wantTv && isSeriesUrl) score += 15;
    if (!wantTv && !isSeriesUrl) score += 10;
    return score;
}

/**
 * Pick the best matching result from a site search.
 * @returns {object|null} best result or null
 */
export function pickBestResult(results, details, wantTv) {
    let best = null;
    let bestScore = -1;
    for (let i = 0; i < results.length; i++) {
        const score = scoreResult(results[i], details, wantTv);
        if (score > bestScore) {
            bestScore = score;
            best = results[i];
        }
    }
    return best;
}
