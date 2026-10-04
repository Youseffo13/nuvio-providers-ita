/**
 * StreamingCommunity - Nuvio provider
 * Ported from doGior's CloudStream provider (doGiorsHadEnough - StreamingCommunity).
 *
 * In CloudStream the provider loads the site (streamingunity.win) and calls two
 * extractors: VixCloud (site iframe) and VixSrc (vixsrc.to). VixSrc addresses the
 * exact same content backend but is keyed by TMDB id, which is what Nuvio passes
 * to providers - so this port goes straight through VixSrc with a single request:
 *
 *   movie -> https://vixsrc.to/movie/{tmdbId}?lang=it
 *   tv    -> https://vixsrc.to/tv/{tmdbId}/{season}/{episode}?lang=it
 */

import { extractVixSrc, buildVixSrcPageUrl, VIXSRC_REFERER } from './vixsrc.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/133.0';

/**
 * @param {string} tmdbId   TMDB id of the media
 * @param {string} mediaType "movie" or "tv"
 * @param {number} season    season number (tv only)
 * @param {number} episode   episode number (tv only)
 * @returns {Promise<Array>} list of stream objects
 */
async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        console.log('[StreamingCommunity] Request: ' + mediaType + ' ' + tmdbId +
            (mediaType === 'tv' ? ' S' + (season || 1) + 'E' + (episode || 1) : ''));

        const pageUrl = buildVixSrcPageUrl(tmdbId, mediaType, season, episode);
        const playlistUrl = await extractVixSrc(pageUrl);
        if (!playlistUrl) {
            return [];
        }

        return [{
            name: 'VixSrc',
            title: 'StreamingCommunity - VixSrc (ITA)',
            url: playlistUrl,
            quality: 'AUTO',
            headers: {
                'Referer': VIXSRC_REFERER,
                'User-Agent': UA,
            },
        }];
    } catch (error) {
        console.error('[StreamingCommunity] Error: ' + error.message);
        return [];
    }
}

module.exports = { getStreams };
