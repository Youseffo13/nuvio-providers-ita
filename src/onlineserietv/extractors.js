/**
 * Stream extractors (Hermes-safe JS).
 * Ports of doGior's CloudStream extractors:
 *   - VixSrcExtractor.kt  (page-based masterPlaylist parsing)
 *   - StreamTapeExtractor.kt
 *   - MaxStreamExtractor.kt  (Dean Edwards p,a,c,k,e,d unpacker reimplemented in JS)
 *   - CloudStream's MixDrop extractor
 * plus the vixsrc.to API resolver used by AltaDefinizione.loadLinks.
 */
import { fetchText, DEFAULT_HEADERS } from './util.js';
import cheerio from 'cheerio-without-node-native';

// ---------------------------------------------------------------------------
// Generic: Dean Edwards packed JS unpacker (replaces CloudStream getAndUnpack)
// ---------------------------------------------------------------------------

/** Convert an index to its packed token in base `a` (Dean Edwards' e function). */
function decodeToken(c, a) {
    return (c < a ? '' : decodeToken(Math.floor(c / a), a)) +
        ((c % a) > 35 ? String.fromCharCode((c % a) + 29) : (c % a).toString(36));
}

function unescapeJsString(s) {
    return s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

/**
 * Find an `eval(function(p,a,c,k,e,d){...}('payload',a,c,'k|k|k'.split('|'),0,{}))`
 * block in `text` and return the unpacked source. Returns null if not found.
 */
export function extractPackedScript(text) {
    try {
        const idx = text.indexOf('eval(function(p,a,c,k,e,d)');
        if (idx === -1) return null;

        const m = text.slice(idx).match(
            /\}\s*\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:[^'\\]|\\.)*)'\s*\.\s*split\s*\(\s*'\|'\s*\)/
        );
        if (!m) return null;

        const p = unescapeJsString(m[1]);
        const a = parseInt(m[2], 10);
        const c = parseInt(m[3], 10);
        const k = unescapeJsString(m[4]).split('|');

        let out = p;
        for (let i = c - 1; i >= 0; i--) {
            if (k[i]) {
                out = out.replace(new RegExp('\\b' + decodeToken(i, a) + '\\b', 'g'), k[i]);
            }
        }
        return out;
    } catch (e) {
        console.error('[Unpacker] Failed: ' + e.message);
        return null;
    }
}

// ---------------------------------------------------------------------------
// VixSrc (vixsrc.to)
// ---------------------------------------------------------------------------

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
 * Fetch a vixsrc.to embed page and return the master m3u8 playlist URL.
 * Accepts a TMDB page URL, a mirror link (imdb-keyed) or a direct embed URL.
 */
export async function extractVixSrc(pageOrEmbedUrl) {
    let embedUrl = pageOrEmbedUrl;
    if (embedUrl.indexOf('/embed/') === -1) {
        embedUrl = await resolveEmbedUrl(pageOrEmbedUrl);
        if (!embedUrl) return null;
    }

    const html = await fetchText(embedUrl, { headers: VIXSRC_HEADERS });

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
        console.log('[VixSrc] No masterPlaylist script found on ' + pageUrl);
        return null;
    }

    const json = parseWindowObject(scriptData);
    const mp = json && json.masterPlaylist;
    if (!mp || !mp.url || !mp.params) {
        console.log('[VixSrc] masterPlaylist missing or empty');
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
 * Build the vixsrc.to page URL for a TMDB id (same mapping used by
 * doGior's StreamingCommunity provider).
 */
export function buildVixSrcPageUrl(tmdbId, mediaType, season, episode) {
    if (mediaType === 'tv') {
        return VIXSRC_BASE + '/tv/' + tmdbId + '/' + (season || 1) + '/' + (episode || 1) + '?lang=it';
    }
    return VIXSRC_BASE + '/movie/' + tmdbId + '?lang=it';
}

/**
 * Resolve a TMDB-based page URL (/movie/{tmdbId}, /tv/{tmdbId}/{s}/{e}) to the
 * embed URL via the vixsrc JSON API (site migrated to Next.js in 2026:
 * player pages are client-rendered, the API + embed flow still works).
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
 * Port of AltaDefinizione.loadLinks(): resolves a vixsrc mirror link to an
 * embed URL via the JSON API. Mirrors come in two shapes:
 *   https://vixsrc.to/movie/tt1234567/          (imdb-keyed)
 *   https://vixsrc.to/tv/tt1234567/2/5/         (imdb + season + episode)
 */
export async function resolveVixSrcMirror(mirrorUrl) {
    const m = mirrorUrl.match(/vixsrc\.to\/(movie|tv)\/tt(\d+)(?:\/(\d+)(?:\/(\d+))?)?/);
    if (!m) {
        // Already a direct vixsrc page or embed URL
        return mirrorUrl;
    }
    const type = m[1];
    const imdbId = 'tt' + m[2];
    let api;
    if (type === 'tv') {
        api = VIXSRC_BASE + '/api/tv/' + imdbId + '/' + (m[3] || 1) + '/' + (m[4] || 1) + '?lang=it';
    } else {
        api = VIXSRC_BASE + '/api/movie/' + imdbId + '?lang=it';
    }
    const raw = await fetchText(api, { headers: VIXSRC_HEADERS });
    const data = JSON.parse(raw);
    if (!data || !data.src) return null;
    return VIXSRC_BASE + data.src;
}

// ---------------------------------------------------------------------------
// StreamTape
// ---------------------------------------------------------------------------

const STREAMTAPE_EMBED = 'https://streamtape.com/e/';

/** Port of StreamTapeExtractor.getUrl(). Returns the direct mp4 URL or null. */
export async function extractStreamTape(url) {
    let newUrl = url;
    if (url.indexOf(STREAMTAPE_EMBED) !== 0) {
        const parts = url.split('/');
        const id = parts[4];
        if (!id) return null;
        newUrl = STREAMTAPE_EMBED + id;
    }

    const html = await fetchText(newUrl);

    const targetLine = "document.getElementById('robotlink')";
    const innerMarker = targetLine + ".innerHTML = '";
    const innerIdx = html.indexOf(innerMarker);
    if (innerIdx === -1) return null;

    let rest = html.slice(innerIdx + innerMarker.length);
    const quoteEnd = rest.indexOf("'");
    if (quoteEnd === -1) return null;
    const part1 = rest.slice(0, quoteEnd);

    const xcdMarker = "+ ('xcd";
    const xcdIdx = html.indexOf(xcdMarker);
    if (xcdIdx === -1) return null;
    rest = html.slice(xcdIdx + xcdMarker.length);
    const quoteEnd2 = rest.indexOf("'");
    if (quoteEnd2 === -1) return null;
    const part2 = rest.slice(0, quoteEnd2);

    const raw = part1 + part2;
    return raw.indexOf('http') === 0 ? raw : 'https:' + raw;
}

// ---------------------------------------------------------------------------
// MaxStream
// ---------------------------------------------------------------------------

/** Port of MaxStreamExtractor.getUrl(). Returns the m3u8 URL or null. */
export async function extractMaxStream(url) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US;q=0.5,en;q=0.3',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    };
    const html = await fetchText(url, { headers });
    const unpacked = extractPackedScript(html);
    if (!unpacked) {
        console.log('[MaxStream] No packed script found on ' + url);
        return null;
    }
    const m = unpacked.match(/src\s*:\s*"([^"]+)"/);
    if (!m || !m[1]) {
        console.log('[MaxStream] No src found in unpacked script');
        return null;
    }
    return m[1];
}

// ---------------------------------------------------------------------------
// MixDrop
// ---------------------------------------------------------------------------

/** Port of CloudStream's MixDrop extractor. Returns the direct mp4 URL or null. */
export async function extractMixDrop(url) {
    let embedUrl = url;
    if (embedUrl.indexOf('/e/') === -1) {
        embedUrl = embedUrl.replace('/f/', '/e/');
    }
    const html = await fetchText(embedUrl);
    const unpacked = extractPackedScript(html);
    if (!unpacked) {
        console.log('[MixDrop] No packed script found on ' + embedUrl);
        return null;
    }
    const m = unpacked.match(/wurl\s*=\s*"([^"]+)"/);
    if (!m || !m[1]) return null;
    let wurl = m[1];
    if (wurl.indexOf('//') === 0) {
        wurl = 'https:' + wurl;
    }
    return wurl;
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

/**
 * Resolve a mirror/embed URL to a stream object.
 * @returns {Promise<{name:string, url:string, quality:string}|null>}
 */
export async function resolveMirror(mirrorUrl, providerTag) {
    const u = String(mirrorUrl || '').toLowerCase();
    try {
        if (u.indexOf('vixsrc') !== -1) {
            let embed = mirrorUrl;
            if (embed.indexOf('/embed/') === -1) {
                embed = await resolveVixSrcMirror(mirrorUrl);
            }
            if (embed) {
                const playlist = await extractVixSrc(embed);
                if (playlist) return { name: 'VixSrc', url: playlist, quality: 'AUTO' };
            }
            return null;
        }
        if (u.indexOf('streamtape') !== -1 || u.indexOf('streamta.') !== -1 || u.indexOf('strcloud') !== -1) {
            const direct = await extractStreamTape(mirrorUrl);
            if (direct) return { name: 'StreamTape', url: direct, quality: 'AUTO' };
            return null;
        }
        if (u.indexOf('maxstream') !== -1) {
            const direct = await extractMaxStream(mirrorUrl);
            if (direct) return { name: 'MaxStream', url: direct, quality: 'AUTO' };
            return null;
        }
        if (u.indexOf('mixdrop') !== -1) {
            const direct = await extractMixDrop(mirrorUrl);
            if (direct) return { name: 'MixDrop', url: direct, quality: 'AUTO' };
            return null;
        }
        console.log('[Extractor] Unsupported mirror host: ' + mirrorUrl);
    } catch (e) {
        console.error('[Extractor] Failed for ' + mirrorUrl + ': ' + e.message);
    }
    return null;
}
