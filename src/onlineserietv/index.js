/**
 * OnlineSerieTV - Nuvio provider
 * Ported from doGior's CloudStream provider (doGiorsHadEnough - OnlineSerieTV).
 *
 * Flow:
 *   1. TMDB details -> title (+ year)
 *   2. Site search (?s=query) on #box_movies .movie cards
 *   3. Movie page: #hostlinks <a> links
 *      TV page: #hostlinks table (season header rows + episode rows)
 *   4. uprot.net protected links are bypassed, then dispatched to
 *      StreamTape / MaxStream / MixDrop / VixSrc extractors.
 */

import { fetchText, loadHtml, fixUrl, pickBestResult } from './util.js';
import { fetchTmdbDetails } from './tmdb.js';
import { resolveMirror } from './extractors.js';

const MAIN_URL = 'https://onlineserietv.com';

/**
 * Port of OnlineSerieTV.bypassUprot().
 * msf->mse swap, fetch page, first <a> href is the real host link.
 * @returns {Promise<string|null>}
 */
async function bypassUprot(link) {
    const updatedLink = link.indexOf('msf') !== -1 ? link.replace('msf', 'mse') : link;
    try {
        const html = await fetchText(updatedLink);
        const $ = loadHtml(html);
        const href = $('a').first().attr('href');
        return href ? fixUrl(href, updatedLink) : null;
    } catch (e) {
        console.error('[OnlineSerieTV] uprot bypass failed: ' + e.message);
        return null;
    }
}

/**
 * Collect host links for a movie page.
 * Port of OnlineSerieTV.load() movie branch: #hostlinks a.
 */
function getMovieLinks($) {
    const links = [];
    $('#hostlinks').find('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href) links.push(href);
    });
    return links;
}

/**
 * Collect per-episode host links for a TV page.
 * Port of OnlineSerieTV.getEpisodes(): #hostlinks table rows, where single-cell
 * rows are season headers ("Stagione N ...") and multi-cell rows are episodes
 * ("1x01 - Title" + <a> links).
 * @returns {Object} map: { season: { episode: [links] } }
 */
function getEpisodeLinks($) {
    const table = $('#hostlinks table').first();
    const map = {};
    let currentSeason = 1;

    table.find('tr').each((i, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        if (cells.length === 0) return;

        if (cells.length === 1) {
            const seasonText = $row.find('td:nth-child(1)').text()
                .replace(' - Episodi disponibili', '');
            const m = seasonText.match(/\d+/);
            if (m) currentSeason = parseInt(m[0], 10);
            return;
        }

        const title = $row.find('td:nth-child(1)').text().trim();

        // "1x05 - Something" -> 5
        const xIdx = title.indexOf('x');
        if (xIdx === -1) return;
        const epNumber = parseInt(title.slice(xIdx + 1).split(' ')[0], 10);
        if (isNaN(epNumber)) return;

        const links = [];
        $row.find('a').each((j, a) => {
            const href = $(a).attr('href');
            if (href) links.push(href);
        });
        if (links.length === 0) return;

        if (!map[currentSeason]) map[currentSeason] = {};
        map[currentSeason][epNumber] = (map[currentSeason][epNumber] || []).concat(links);
    });
    return map;
}

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        const seasonNum = season || 1;
        const episodeNum = episode || 1;
        console.log('[OnlineSerieTV] Request: ' + mediaType + ' ' + tmdbId +
            (mediaType === 'tv' ? ' S' + seasonNum + 'E' + episodeNum : ''));

        // 1. TMDB details
        const details = await fetchTmdbDetails(tmdbId, mediaType);
        if (!details || !details.title) {
            console.log('[OnlineSerieTV] No TMDB details');
            return [];
        }
        const wantTv = mediaType === 'tv';

        // 2. Site search
        const searchHtml = await fetchText(MAIN_URL + '/?s=' + encodeURIComponent(details.title));
        const $search = loadHtml(searchHtml);
        const results = [];
        $search('#box_movies .movie').each((i, el) => {
            const node = $search(el);
            const href = node.find('a').first().attr('href');
            let title = node.find('h2').text().trim();
            if (!href || !title) return;
            title = title.replace(/\s*\d{4}\s*$/, ''); // strip trailing year
            results.push({ title: title, url: fixUrl(href, MAIN_URL), text: node.text() });
        });
        console.log('[OnlineSerieTV] Search results: ' + results.length);

        const target = pickBestResult(results, details, wantTv);
        if (!target) {
            console.log('[OnlineSerieTV] No matching page for "' + details.title + '"');
            return [];
        }
        console.log('[OnlineSerieTV] Matched: ' + target.title + ' -> ' + target.url);

        // 3. Load detail page and collect host links
        const pageHtml = await fetchText(target.url);
        const $ = loadHtml(pageHtml);

        let links = [];
        const isMoviePage = target.url.indexOf('/film/') !== -1;
        if (isMoviePage && !wantTv) {
            links = getMovieLinks($);
        } else if (!isMoviePage && wantTv) {
            const episodeMap = getEpisodeLinks($);
            const seasonEntry = episodeMap[seasonNum] || {};
            links = seasonEntry[episodeNum] || [];
            if (links.length === 0) {
                const keys = Object.keys(seasonEntry);
                if (keys.length > 0) links = seasonEntry[keys[0]] || [];
            }
        } else {
            // Type mismatch between TMDB and site page: try both sources
            links = getMovieLinks($);
            if (links.length === 0) {
                const episodeMap = getEpisodeLinks($);
                const seasonEntry = episodeMap[seasonNum] || {};
                links = seasonEntry[episodeNum] || [];
            }
        }

        if (links.length === 0) {
            console.log('[OnlineSerieTV] No host links found');
            return [];
        }
        console.log('[OnlineSerieTV] Host links: ' + links.length);

        // 4. Bypass uprot links and dispatch to extractors
        const streams = [];
        const seen = {};
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            if (link.indexOf('uprot') === -1) continue;

            const bypassed = await bypassUprot(link);
            if (!bypassed) continue;
            if (seen[bypassed]) continue;
            seen[bypassed] = true;
            console.log('[OnlineSerieTV] Bypassed: ' + bypassed);

            const resolved = await resolveMirror(bypassed, 'OnlineSerieTV');
            if (resolved) {
                streams.push({
                    name: resolved.name,
                    title: 'OnlineSerieTV - ' + resolved.name,
                    url: resolved.url,
                    quality: resolved.quality,
                    headers: {},
                });
            }
        }

        console.log('[OnlineSerieTV] Streams found: ' + streams.length);
        return streams;
    } catch (error) {
        console.error('[OnlineSerieTV] Error: ' + error.message);
        return [];
    }
}

module.exports = { getStreams };
