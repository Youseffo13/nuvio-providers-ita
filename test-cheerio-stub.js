/** Minimal cheerio stub for node-side tests (bundled providers only use .load in extractors used here). */
module.exports = { default: { load: () => () => ({ attr: () => '', html: () => '', each: () => {} }) } };
