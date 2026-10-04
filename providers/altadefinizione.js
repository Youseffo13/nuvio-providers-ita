/**
 * altadefinizione - Built from src/altadefinizione/
 * Generated: 2026-10-04T18:28:10.333Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/altadefinizione/util.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
var DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
  "Connection": "keep-alive"
};
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const res = yield fetch(url, {
      method: options.method || "GET",
      headers: Object.assign({}, DEFAULT_HEADERS, options.headers || {}),
      body: options.body
    });
    if (!res.ok) {
      throw new Error("HTTP " + res.status + " for " + url);
    }
    return yield res.text();
  });
}
function loadHtml(html) {
  return import_cheerio_without_node_native.default.load(html);
}
function fixUrl(url, base) {
  if (!url)
    return "";
  if (url.indexOf("http") === 0)
    return url;
  if (url.indexOf("//") === 0)
    return "https:" + url;
  if (url.indexOf("/") === 0) {
    const m = base.match(/^(https?:\/\/[^\/]+)/);
    return m ? m[1] + url : url;
  }
  return base.replace(/\/$/, "") + "/" + url;
}
var ACCENTS = [
  [/[àáâãäå]/g, "a"],
  [/èéêë/g, "e"],
  [/ìíîï/g, "i"],
  [/òóôõö/g, "o"],
  [/ùúûü/g, "u"],
  [/ç/g, "c"],
  [/ñ/g, "n"]
];
function normalizeTitle(s) {
  if (!s)
    return "";
  let t = String(s).toLowerCase();
  for (let i = 0; i < ACCENTS.length; i++) {
    t = t.replace(ACCENTS[i][0], ACCENTS[i][1]);
  }
  t = t.replace(/&/g, " and ");
  t = t.replace(/[^a-z0-9]+/g, " ").trim();
  return t;
}
function scoreResult(result, details, wantTv) {
  const nTmdb = normalizeTitle(details.title);
  const nOrig = normalizeTitle(details.originalTitle);
  const nSite = normalizeTitle(result.title);
  if (!nSite)
    return -1;
  let score = -1;
  if (nSite === nTmdb || nOrig && nSite === nOrig) {
    score = 100;
  } else if (nTmdb && nSite.indexOf(nTmdb) === 0 || nOrig && nSite.indexOf(nOrig) === 0 || nTmdb && nTmdb.indexOf(nSite) === 0) {
    score = 60;
  } else if (nSite.indexOf(nTmdb) !== -1 || nOrig && nSite.indexOf(nOrig) !== -1) {
    score = 40;
  } else {
    return -1;
  }
  const year = String(details.year || "");
  if (year) {
    if (result.text && result.text.indexOf(year) !== -1)
      score += 10;
    if (result.url && result.url.indexOf(year) !== -1)
      score += 5;
  }
  const isSeriesUrl = /serie[-_]tv/.test(result.url || "");
  if (wantTv && isSeriesUrl)
    score += 15;
  if (!wantTv && !isSeriesUrl)
    score += 10;
  return score;
}
function pickBestResult(results, details, wantTv) {
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

// src/altadefinizione/tmdb.js
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
function fetchTmdbDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = TMDB_BASE_URL + "/" + mediaType + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=it-IT&append_to_response=external_ids";
      const res = yield fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      });
      if (!res.ok) {
        throw new Error("TMDB HTTP " + res.status);
      }
      const data = yield res.json();
      return {
        title: data.title || data.name || data.original_title || data.original_name || "",
        originalTitle: data.original_title || data.original_name || "",
        year: (data.release_date || data.first_air_date || "").substring(0, 4),
        imdbId: data.external_ids ? data.external_ids.imdb_id || null : null
      };
    } catch (e) {
      console.error("[TMDB] Failed to fetch details for " + mediaType + "/" + tmdbId + ": " + e.message);
      return null;
    }
  });
}

// src/altadefinizione/extractors.js
var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));
var VIXSRC_BASE = "https://vixsrc.to";
var VIXSRC_REFERER = "https://vixsrc.to/";
var VIXSRC_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/133.0",
  "Accept": "*/*",
  "Referer": VIXSRC_REFERER,
  "Connection": "keep-alive"
};
function parseWindowObject(script) {
  try {
    const keyRegex = /window\.(\w+)\s*=/g;
    const keys = [];
    let m;
    while ((m = keyRegex.exec(script)) !== null) {
      keys.push(m[1]);
    }
    if (keys.length === 0)
      return null;
    const parts = script.split(/window\.(\w+)\s*=/);
    const jsonObjects = [];
    for (let i = 0; i < keys.length; i++) {
      const value = parts[2 + i * 2] || "";
      const cleaned = value.replace(/;/g, "").replace(/(\{|\[|,)\s*(\w+)\s*:/g, '$1 "$2":').replace(/,(\s*[}\]])/g, "$1").trim();
      jsonObjects.push('"' + keys[i] + '": ' + cleaned);
    }
    const finalObject = ("{\n" + jsonObjects.join(",\n") + "\n}").replace(/'/g, '"');
    return JSON.parse(finalObject);
  } catch (e) {
    console.error("[VixSrc] Failed to parse window script: " + e.message);
    return null;
  }
}
function extractVixSrc(pageOrEmbedUrl) {
  return __async(this, null, function* () {
    let embedUrl = pageOrEmbedUrl;
    if (embedUrl.indexOf("/embed/") === -1) {
      embedUrl = yield resolveEmbedUrl(pageOrEmbedUrl);
      if (!embedUrl)
        return null;
    }
    const html = yield fetchText(embedUrl, { headers: VIXSRC_HEADERS });
    const $ = import_cheerio_without_node_native2.default.load(html);
    let scriptData = "";
    $("script").each((i, el) => {
      if (scriptData)
        return;
      const data = $(el).html() || "";
      if (data.indexOf("masterPlaylist") !== -1) {
        scriptData = data.replace(/\n/g, "	");
      }
    });
    if (!scriptData) {
      console.log("[VixSrc] No masterPlaylist script found on " + pageUrl);
      return null;
    }
    const json = parseWindowObject(scriptData);
    const mp = json && json.masterPlaylist;
    if (!mp || !mp.url || !mp.params) {
      console.log("[VixSrc] masterPlaylist missing or empty");
      return null;
    }
    const params = "token=" + mp.params.token + "&expires=" + mp.params.expires;
    let playlistUrl;
    if (mp.url.indexOf("?b") !== -1) {
      playlistUrl = mp.url.replace("?b:1", "?b=1") + "&" + params;
    } else {
      playlistUrl = mp.url + "?" + params;
    }
    if (json.canPlayFHD === true) {
      playlistUrl += "&h=1";
    }
    return playlistUrl;
  });
}
function buildVixSrcPageUrl(tmdbId, mediaType, season, episode) {
  if (mediaType === "tv") {
    return VIXSRC_BASE + "/tv/" + tmdbId + "/" + (season || 1) + "/" + (episode || 1) + "?lang=it";
  }
  return VIXSRC_BASE + "/movie/" + tmdbId + "?lang=it";
}
function resolveEmbedUrl(pageUrl2) {
  return __async(this, null, function* () {
    const m = pageUrl2.match(/^(https?:\/\/[^\/]+)\/(movie|tv)\/([^?#]*)(\?[^#]*)?/);
    if (!m) {
      console.log("[VixSrc] Unrecognized page URL: " + pageUrl2);
      return null;
    }
    const api = m[1] + "/api/" + m[2] + "/" + m[3] + (m[4] || "?lang=it");
    const raw = yield fetchText(api, { headers: VIXSRC_HEADERS });
    const data = JSON.parse(raw);
    if (!data || !data.src) {
      console.log("[VixSrc] API returned no src for " + api);
      return null;
    }
    return m[1] + data.src;
  });
}

// src/altadefinizione/index.js
var DOMAINS = ["https://altadefinizionex.me", "https://altadefinizione.autos"];
var cachedMainUrl = "";
function getMainUrl() {
  return __async(this, null, function* () {
    if (cachedMainUrl)
      return cachedMainUrl;
    for (let i = 0; i < DOMAINS.length; i++) {
      try {
        const res = yield fetch(DOMAINS[i] + "/", { headers: DEFAULT_HEADERS });
        if (res.ok) {
          cachedMainUrl = DOMAINS[i];
          return cachedMainUrl;
        }
      } catch (e) {
      }
    }
    cachedMainUrl = DOMAINS[0];
    return cachedMainUrl;
  });
}
function searchSite(mainUrl, query) {
  return __async(this, null, function* () {
    const url = mainUrl + "/index.php?do=search&subaction=search&story=" + encodeURIComponent(query);
    const html = yield fetchText(url);
    const $ = loadHtml(html);
    const results = [];
    $("#dle-content div.movie").each((i, el) => {
      const node = $(el);
      const title = node.find("h2.movie-title a").first().text().trim();
      const href = node.attr("data-link") || node.find("a").first().attr("href");
      if (title && href) {
        results.push({
          title,
          url: fixUrl(href, mainUrl),
          text: (node.attr("data-story") || "") + " " + (node.attr("data-year") || "")
        });
      }
    });
    return results;
  });
}
function extractImdbFromPage($, html) {
  const m = html.match(/imdb\s*=\s*'(tt\d+)'/);
  if (m)
    return m[1];
  const iframeSrc = $("iframe#dle-player").attr("src") || "";
  const m2 = iframeSrc.match(/vixsrc\.to\/(?:movie|tv)\/(tt\d+)/);
  if (m2)
    return m2[1];
  return null;
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const seasonNum = season || 1;
      const episodeNum = episode || 1;
      console.log("[AltaDefinizione] Request: " + mediaType + " " + tmdbId + (mediaType === "tv" ? " S" + seasonNum + "E" + episodeNum : ""));
      const details = yield fetchTmdbDetails(tmdbId, mediaType);
      if (!details || !details.title) {
        console.log("[AltaDefinizione] No TMDB details");
        return [];
      }
      const wantTv = mediaType === "tv";
      const mainUrl = yield getMainUrl();
      const results = yield searchSite(mainUrl, details.title);
      console.log("[AltaDefinizione] Search results: " + results.length);
      let imdbId = details.imdbId;
      const target = pickBestResult(results, details, wantTv);
      if (target) {
        console.log("[AltaDefinizione] Matched: " + target.title);
        try {
          const html = yield fetchText(target.url);
          const $ = loadHtml(html);
          imdbId = imdbId || extractImdbFromPage($, html);
        } catch (e) {
          console.log("[AltaDefinizione] Detail page failed: " + e.message);
        }
      } else if (!imdbId) {
        console.log("[AltaDefinizione] No matching page and no imdb id");
      }
      let vixsrcPage;
      if (imdbId) {
        vixsrcPage = wantTv ? "https://vixsrc.to/tv/" + imdbId + "/" + seasonNum + "/" + episodeNum + "?lang=it" : "https://vixsrc.to/movie/" + imdbId + "?lang=it";
      } else {
        vixsrcPage = buildVixSrcPageUrl(tmdbId, mediaType, seasonNum, episodeNum);
      }
      const playlist = yield extractVixSrc(vixsrcPage);
      if (!playlist) {
        return [];
      }
      console.log("[AltaDefinizione] Streams found: 1");
      return [{
        name: "VixSrc",
        title: "AltaDefinizione - VixSrc (ITA)",
        url: playlist,
        quality: "AUTO",
        headers: { "Referer": VIXSRC_REFERER }
      }];
    } catch (error) {
      console.error("[AltaDefinizione] Error: " + error.message);
      return [];
    }
  });
}
module.exports = { getStreams };
