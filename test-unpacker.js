/**
 * Offline test for the packed-JS unpacker (Dean Edwards p,a,c,k,e,d).
 * Bundles src/altadefinizione/extractors.js to a temp file and validates
 * the unpacker against a realistic MaxStream-style packed payload.
 * Run: node test-unpacker.js
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const esbuild = require('esbuild');

const html = `<html><script type='text/javascript'>eval(function(p,a,c,k,e,d){e=function(c){return c.toString(a)};if(!''.replace(/^/,String)){while(c--){d[c.toString(a)]=k[c]||c.toString(a)}k=[function(e){return d[e]}];e=function(){return'\\w+'};c=1};while(c--){if(k[c]){p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c])}}return p}('0 1={"2":"3:\\/\\/4.5\\/6.7","8":9};',62,10,'var|config|src|https|cdn|example|m3u8|file|quality|1080p'.split('|'),0,{}))</script></html>`;

async function main() {
    const tmpOut = path.join(os.tmpdir(), 'unpacker-test-' + Date.now() + '.cjs');
    try {
        await esbuild.build({
            entryPoints: [path.join(__dirname, 'src/altadefinizione/extractors.js')],
            bundle: true,
            format: 'cjs',
            platform: 'neutral',
            outfile: tmpOut,
            external: ['cheerio-without-node-native'],
            logLevel: 'error',
        });
        // cheerio is external -> provide a stub for node
        const Module = require('module');
        const origResolve = Module._resolveFilename;
        Module._resolveFilename = function (request, ...args) {
            if (request === 'cheerio-without-node-native') {
                return require.resolve('./test-cheerio-stub.js');
            }
            return origResolve.call(this, request, ...args);
        };

        const { extractPackedScript } = require(tmpOut);
        const out = extractPackedScript(html);
        console.log('UNPACKED:', out);

        // Unpacked code is raw JS: slashes may stay escaped (\/) and values unquoted
        if (out && out.indexOf('var config=') !== -1 &&
            out.indexOf('cdn.example') !== -1 &&
            out.indexOf('m3u8.file') !== -1 &&
            out.indexOf('1080p') !== -1) {
            console.log('UNPACKER OK');
        } else {
            console.log('UNPACKER FAILED');
            process.exit(1);
        }
    } finally {
        if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    }
}

main().catch(err => {
    console.error('Test error:', err.message);
    process.exit(1);
});
