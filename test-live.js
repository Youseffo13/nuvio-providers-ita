/**
 * Live provider test harness.
 * Usage: node test-live.js <provider> <tmdbId> <movie|tv> [season] [episode]
 * Example: node test-live.js streamingcommunity 550 movie
 *          node test-live.js altadefinizione 1396 tv 1 1
 */

const providerName = process.argv[2];
const tmdbId = process.argv[3] || '550';
const mediaType = process.argv[4] || 'movie';
const season = parseInt(process.argv[5] || '1', 10);
const episode = parseInt(process.argv[6] || '1', 10);

if (!providerName) {
    console.error('Usage: node test-live.js <provider> <tmdbId> <movie|tv> [season] [episode]');
    process.exit(1);
}

const { getStreams } = require('./providers/' + providerName + '.js');

async function run() {
    console.log('=== Testing ' + providerName + ' | TMDB ' + tmdbId + ' | ' +
        mediaType + (mediaType === 'tv' ? ' S' + season + 'E' + episode : '') + ' ===');
    try {
        const streams = await getStreams(tmdbId, mediaType, season, episode);
        console.log('--- Streams found: ' + streams.length);
        for (const s of streams) {
            const preview = s.url.length > 110 ? s.url.slice(0, 110) + '...' : s.url;
            console.log('  [' + s.name + '] q=' + s.quality + ' | ' + s.title + '\n    ' + preview);
        }
        if (streams.length === 0) process.exit(2);
    } catch (e) {
        console.error('--- TEST FAILED: ' + e.message);
        process.exit(3);
    }
}

run();
