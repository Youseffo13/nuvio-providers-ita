/**
 * AltaDefinizione - Nuvio provider (updated 2026)
 * Ported from doGior's CloudStream provider (doGiorsHadEnough - AltaDefinizione).
 *
 * The site moved to altadefinizionex.me (DLE CMS) and now embeds the player
 * through vixsrc.to:
 *   - movie pages: <iframe id="dle-player" src="https://vixsrc.to/movie/ttXXXX?lang=it">
 *   - series pages: inline script `var imdb = 'ttXXXX'` builds
 *     https://vixsrc.to/tv/ttXXXX/{season}/{episode}?lang=it
 *
 * Flow:
 *   1. TMDB details -> title (+ imdb id when available)
 *   2. Site search (GET index.php?do=search&subaction=search&story=...)
 *      cards: #dle-content div.movie (h2.movie-title + data-link)
 *   3. Detail page -> imdb id (TMDB first, page fallback)
 *   4. vixsrc.to API/embed -> master playlist
 */

import { fetchText, loadHtml, fixUrl, pickBestResult, DEFAULT_HEADERS } from './util.js';
import { fetchTmdbDetails } from './tmdb.js';
import { extractVixSrc, buildVixSrcPageUrl, VIXSRC_REFERER } from './extractors.js';

const DOMAINS = ['https://altadefinizionex.me', 'https://altadefinizione.autos'];
let cachedMainUrl = '';

/** Probe the known domains and cache the first one that responds. */
async function getMainUrl() {
    if (cachedMainUrl) return cachedMainUrl;
    for (let i = 0; i < DOMAINS.length; i++) {
        try {
            const res = await fetch(DOMAINS[i] + '/', { headers: DEFAULT_HEADERS });
            if (res.ok) {
                cachedMainUrl = DOMAINS[i];
                return cachedMainUrl;
            }
        } catch (e) {
            // try next domain
        }
    }
    cachedMainUrl = DOMAINS[0];
    return cachedMainUrl;
}

/** Site search via GET (the old POST do=search now redirects to the homepage). */
async function searchSite(mainUrl, query) {
    const url = mainUrl + '/index.php?do=search&subaction=search&story=' + encodeURIComponent(query);
    const html = await fetchText(url);
    const $ = loadHtml(html);
    const results = [];
    $('#dle-content div.movie').each((i, el) => {
        const node = $(el);
        const title = node.find('h2.movie-title a').first().text().trim();
        const href = node.attr('data-link') || node.find('a').first().attr('href');
        if (title && href) {
            results.push({
                title: title,
                url: fixUrl(href, mainUrl),
                text: (node.attr('data-story') || '') + ' ' + (node.attr('data-year') || ''),
            });
        }
    });
    return results;
}

/**
 * Extract the imdb id from a detail page: inline `var imdb = 'ttXXXX'`
 * (series) or the dle-player iframe src (movies).
 */
function extractImdbFromPage($, html) {
    const m = html.match(/imdb\s*=\s*'(tt\d+)'/);
    if (m) return m[1];
    const iframeSrc = $('iframe#dle-player').attr('src') || '';
    const m2 = iframeSrc.match(/vixsrc\.to\/(?:movie|tv)\/(tt\d+)/);
    if (m2) return m2[1];
    return null;
}

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        const seasonNum = season || 1;
        const episodeNum = episode || 1;
        console.log('[AltaDefinizione] Request: ' + mediaType + ' ' + tmdbId +
            (mediaType === 'tv' ? ' S' + seasonNum + 'E' + episodeNum : ''));

        // 1. TMDB details
        const details = await fetchTmdbDetails(tmdbId, mediaType);
        if (!details || !details.title) {
            console.log('[AltaDefinizione] No TMDB details');
            return [];
        }
        const wantTv = mediaType === 'tv';

        // 2. Site search + best match
        const mainUrl = await getMainUrl();
        const results = await searchSite(mainUrl, details.title);
        console.log('[AltaDefinizione] Search results: ' + results.length);

        let imdbId = details.imdbId;
        const target = pickBestResult(results, details, wantTv);
        if (target) {
            console.log('[AltaDefinizione] Matched: ' + target.title);
            try {
                const html = await fetchText(target.url);
                const $ = loadHtml(html);
                imdbId = imdbId || extractImdbFromPage($, html);
            } catch (e) {
                console.log('[AltaDefinizione] Detail page failed: ' + e.message);
            }
        } else if (!imdbId) {
            console.log('[AltaDefinizione] No matching page and no imdb id');
        }

        // 3. Build the vixsrc page URL (imdb id preferred, TMDB id fallback)
        let vixsrcPage;
        if (imdbId) {
            vixsrcPage = wantTv
                ? 'https://vixsrc.to/tv/' + imdbId + '/' + seasonNum + '/' + episodeNum + '?lang=it'
                : 'https://vixsrc.to/movie/' + imdbId + '?lang=it';
        } else {
            vixsrcPage = buildVixSrcPageUrl(tmdbId, mediaType, seasonNum, episodeNum);
        }

        // 4. Extract the playlist
        const playlist = await extractVixSrc(vixsrcPage);
        if (!playlist) {
            return [];
        }

        console.log('[AltaDefinizione] Streams found: 1');
        return [{
            name: 'VixSrc',
            title: 'AltaDefinizione - VixSrc (ITA)',
            url: playlist,
            quality: 'AUTO',
            headers: { 'Referer': VIXSRC_REFERER },
        }];
    } catch (error) {
        console.error('[AltaDefinizione] Error: ' + error.message);
        return [];
    }
}

module.exports = { getStreams };
