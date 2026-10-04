/**
 * VixSrc extractor (updated 2026 flow)
 * Ported to JS from doGior's CloudStream provider (doGiorsHadEnough - VixSrcExtractor.kt).
 *
 * The vixsrc.to site migrated to Next.js: TMDB-based player pages are now
 * client-rendered, but the JSON API + embed player still expose the classic
 * `window.masterPlaylist` object. Full flow:
 *
 *   1. GET  /api/movie/{tmdbId}?lang=it        (or /api/tv/{tmdbId}/{s}/{e})
 *      -> { "src": "/embed/{id}?token=...&expires=...&lang=it" }
 *   2. GET  /embed/{id}?token=...  (Referer: https://vixsrc.to/ required)
 *      -> inline script: window.masterPlaylist = { params: {token, expires}, url }
 *   3. playlist = masterPlaylist.url + "&token=..&expires=.." (+ "&h=1" if canPlayFHD)
 *
 * Hermes-safe: no matchAll/replaceAll/URL/eval.
 */
import { fetchText } from './util.js';
import cheerio from 'cheerio-without-node-native';

export const VIXSRC_BASE = 'https://vixsrc.to';
export const VIXSRC_REFERER = 'https://vixsrc.to/';

const VIXSRC_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/133.0',
    'Accept': '*/*',
    'Referer': VIXSRC_REFERER,
    'Connection': 'keep-alive',
};

/** Port of VixSrcExtractor.getSanitisedScript(): window.* assignments -> JSON. */
function parseWindowObject(script) {
    try {
        const keyRegex = /window\.(\w+)\s*=/g;
        const keys = [];
        let m;
        while ((m = keyRegex.exec(script)) !== null) {
            keys.push(m[1]);
        }
        if (keys.length === 0) return null;

        const parts = script.split(/window\.(\w+)\s*=/);
        const jsonObjects = [];
        for (let i = 0; i < keys.length; i++) {
            const value = parts[2 + i * 2] || '';
            const cleaned = value
                .replace(/;/g, '')
                .replace(/(\{|\[|,)\s*(\w+)\s*:/g, '$1 "$2":')
                .replace(/,(\s*[}\]])/g, '$1')
                .trim();
            jsonObjects.push('"' + keys[i] + '": ' + cleaned);
        }
        const finalObject = ('{\n' + jsonObjects.join(',\n') + '\n}').replace(/'/g, '"');
        return JSON.parse(finalObject);
    } catch (e) {
        console.error('[VixSrc] Failed to parse window script: ' + e.message);
        return null;
    }
}

/**
 * Resolve a TMDB-based page URL (/movie/{tmdbId}, /tv/{tmdbId}/{s}/{e}) to the
 * embed URL via the vixsrc JSON API.
 * @returns {Promise<string|null>} embed URL or null
 */
async function resolveEmbedUrl(pageUrl) {
    const m = pageUrl.match(/^(https?:\/\/[^\/]+)\/(movie|tv)\/([^?#]*)(\?[^#]*)?/);
    if (!m) {
        console.log('[VixSrc] Unrecognized page URL: ' + pageUrl);
        return null;
    }
    const api = m[1] + '/api/' + m[2] + '/' + m[3] + (m[4] || '?lang=it');
    const raw = await fetchText(api, { headers: VIXSRC_HEADERS });
    const data = JSON.parse(raw);
    if (!data || !data.src) {
        console.log('[VixSrc] API returned no src for ' + api);
        return null;
    }
    return m[1] + data.src;
}

/**
 * Extract the master m3u8 playlist URL from VixSrc.
 * Accepts either a TMDB page URL (https://vixsrc.to/movie/550?lang=it) or a
 * direct embed URL (https://vixsrc.to/embed/170060?token=...).
 * @returns {Promise<string|null>} playlist URL or null
 */
export async function extractVixSrc(pageOrEmbedUrl) {
    let embedUrl = pageOrEmbedUrl;
    if (embedUrl.indexOf('/embed/') === -1) {
        embedUrl = await resolveEmbedUrl(pageOrEmbedUrl);
        if (!embedUrl) return null;
    }

    const html = await fetchText(embedUrl, { headers: VIXSRC_HEADERS });

    // Locate the inline script containing masterPlaylist
    const $ = cheerio.load(html);
    let scriptData = '';
    $('script').each((i, el) => {
        if (scriptData) return;
        const data = $(el).html() || '';
        if (data.indexOf('masterPlaylist') !== -1) {
            scriptData = data.replace(/\n/g, '\t');
        }
    });
    if (!scriptData) {
        console.log('[VixSrc] No masterPlaylist script found on ' + embedUrl);
        return null;
    }

    const json = parseWindowObject(scriptData);
    const mp = json && json.masterPlaylist;
    if (!mp || !mp.url || !mp.params) {
        console.log('[VixSrc] masterPlaylist missing or empty (title may be unavailable)');
        return null;
    }

    const params = 'token=' + mp.params.token + '&expires=' + mp.params.expires;
    let playlistUrl;
    if (mp.url.indexOf('?b') !== -1) {
        playlistUrl = mp.url.replace('?b:1', '?b=1') + '&' + params;
    } else {
        playlistUrl = mp.url + '?' + params;
    }
    if (json.canPlayFHD === true) {
        playlistUrl += '&h=1';
    }
    return playlistUrl;
}

/**
 * Build the VixSrc page URL for a TMDB id (same mapping used by
 * doGior's StreamingCommunity.loadLinks).
 */
export function buildVixSrcPageUrl(tmdbId, mediaType, season, episode) {
    if (mediaType === 'tv') {
        return VIXSRC_BASE + '/tv/' + tmdbId + '/' + (season || 1) + '/' + (episode || 1) + '?lang=it';
    }
    return VIXSRC_BASE + '/movie/' + tmdbId + '?lang=it';
}
