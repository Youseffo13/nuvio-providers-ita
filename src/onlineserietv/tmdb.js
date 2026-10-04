/**
 * TMDB helper - resolves title/year/imdb id from a TMDB id.
 * Uses the same public API key as the other Nuvio providers.
 */

const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * @param {string} tmdbId
 * @param {string} mediaType "movie" or "tv"
 * @returns {Promise<{title:string, originalTitle:string, year:string, imdbId:string|null}|null>}
 */
export async function fetchTmdbDetails(tmdbId, mediaType) {
    try {
        const url = TMDB_BASE_URL + '/' + mediaType + '/' + tmdbId +
            '?api_key=' + TMDB_API_KEY +
            '&language=it-IT' +
            '&append_to_response=external_ids';
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
            },
        });
        if (!res.ok) {
            throw new Error('TMDB HTTP ' + res.status);
        }
        const data = await res.json();
        return {
            title: data.title || data.name || data.original_title || data.original_name || '',
            originalTitle: data.original_title || data.original_name || '',
            year: (data.release_date || data.first_air_date || '').substring(0, 4),
            imdbId: data.external_ids ? (data.external_ids.imdb_id || null) : null,
        };
    } catch (e) {
        console.error('[TMDB] Failed to fetch details for ' + mediaType + '/' + tmdbId + ': ' + e.message);
        return null;
    }
}
