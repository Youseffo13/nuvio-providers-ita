/**
 * onlineserietv - Built from src/onlineserietv/
 * Generated: 2026-10-04T18:28:10.339Z
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

// src/onlineserietv/util.js
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

// src/onlineserietv/tmdb.js
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

// src/onlineserietv/extractors.js
var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));
function decodeToken(c, a) {
  return (c < a ? "" : decodeToken(Math.floor(c / a), a)) + (c % a > 35 ? String.fromCharCode(c % a + 29) : (c % a).toString(36));
}
function unescapeJsString(s) {
  return s.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
}
function extractPackedScript(text) {
  try {
    const idx = text.indexOf("eval(function(p,a,c,k,e,d)");
    if (idx === -1)
      return null;
    const m = text.slice(idx).match(
      /\}\s*\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:[^'\\]|\\.)*)'\s*\.\s*split\s*\(\s*'\|'\s*\)/
    );
    if (!m)
      return null;
    const p = unescapeJsString(m[1]);
    const a = parseInt(m[2], 10);
    const c = parseInt(m[3], 10);
    const k = unescapeJsString(m[4]).split("|");
    let out = p;
    for (let i = c - 1; i >= 0; i--) {
      if (k[i]) {
        out = out.replace(new RegExp("\\b" + decodeToken(i, a) + "\\b", "g"), k[i]);
      }
    }
    return out;
  } catch (e) {
    console.error("[Unpacker] Failed: " + e.message);
    return null;
  }
}
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
function resolveVixSrcMirror(mirrorUrl) {
  return __async(this, null, function* () {
    const m = mirrorUrl.match(/vixsrc\.to\/(movie|tv)\/tt(\d+)(?:\/(\d+)(?:\/(\d+))?)?/);
    if (!m) {
      return mirrorUrl;
    }
    const type = m[1];
    const imdbId = "tt" + m[2];
    let api;
    if (type === "tv") {
      api = VIXSRC_BASE + "/api/tv/" + imdbId + "/" + (m[3] || 1) + "/" + (m[4] || 1) + "?lang=it";
    } else {
      api = VIXSRC_BASE + "/api/movie/" + imdbId + "?lang=it";
    }
    const raw = yield fetchText(api, { headers: VIXSRC_HEADERS });
    const data = JSON.parse(raw);
    if (!data || !data.src)
      return null;
    return VIXSRC_BASE + data.src;
  });
}
var STREAMTAPE_EMBED = "https://streamtape.com/e/";
function extractStreamTape(url) {
  return __async(this, null, function* () {
    let newUrl = url;
    if (url.indexOf(STREAMTAPE_EMBED) !== 0) {
      const parts = url.split("/");
      const id = parts[4];
      if (!id)
        return null;
      newUrl = STREAMTAPE_EMBED + id;
    }
    const html = yield fetchText(newUrl);
    const targetLine = "document.getElementById('robotlink')";
    const innerMarker = targetLine + ".innerHTML = '";
    const innerIdx = html.indexOf(innerMarker);
    if (innerIdx === -1)
      return null;
    let rest = html.slice(innerIdx + innerMarker.length);
    const quoteEnd = rest.indexOf("'");
    if (quoteEnd === -1)
      return null;
    const part1 = rest.slice(0, quoteEnd);
    const xcdMarker = "+ ('xcd";
    const xcdIdx = html.indexOf(xcdMarker);
    if (xcdIdx === -1)
      return null;
    rest = html.slice(xcdIdx + xcdMarker.length);
    const quoteEnd2 = rest.indexOf("'");
    if (quoteEnd2 === -1)
      return null;
    const part2 = rest.slice(0, quoteEnd2);
    const raw = part1 + part2;
    return raw.indexOf("http") === 0 ? raw : "https:" + raw;
  });
}
function extractMaxStream(url) {
  return __async(this, null, function* () {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 6.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "en-US;q=0.5,en;q=0.3",
      "Cache-Control": "max-age=0",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1"
    };
    const html = yield fetchText(url, { headers });
    const unpacked = extractPackedScript(html);
    if (!unpacked) {
      console.log("[MaxStream] No packed script found on " + url);
      return null;
    }
    const m = unpacked.match(/src\s*:\s*"([^"]+)"/);
    if (!m || !m[1]) {
      console.log("[MaxStream] No src found in unpacked script");
      return null;
    }
    return m[1];
  });
}
function extractMixDrop(url) {
  return __async(this, null, function* () {
    let embedUrl = url;
    if (embedUrl.indexOf("/e/") === -1) {
      embedUrl = embedUrl.replace("/f/", "/e/");
    }
    const html = yield fetchText(embedUrl);
    const unpacked = extractPackedScript(html);
    if (!unpacked) {
      console.log("[MixDrop] No packed script found on " + embedUrl);
      return null;
    }
    const m = unpacked.match(/wurl\s*=\s*"([^"]+)"/);
    if (!m || !m[1])
      return null;
    let wurl = m[1];
    if (wurl.indexOf("//") === 0) {
      wurl = "https:" + wurl;
    }
    return wurl;
  });
}
function resolveMirror(mirrorUrl, providerTag) {
  return __async(this, null, function* () {
    const u = String(mirrorUrl || "").toLowerCase();
    try {
      if (u.indexOf("vixsrc") !== -1) {
        let embed = mirrorUrl;
        if (embed.indexOf("/embed/") === -1) {
          embed = yield resolveVixSrcMirror(mirrorUrl);
        }
        if (embed) {
          const playlist = yield extractVixSrc(embed);
          if (playlist)
            return { name: "VixSrc", url: playlist, quality: "AUTO" };
        }
        return null;
      }
      if (u.indexOf("streamtape") !== -1 || u.indexOf("streamta.") !== -1 || u.indexOf("strcloud") !== -1) {
        const direct = yield extractStreamTape(mirrorUrl);
        if (direct)
          return { name: "StreamTape", url: direct, quality: "AUTO" };
        return null;
      }
      if (u.indexOf("maxstream") !== -1) {
        const direct = yield extractMaxStream(mirrorUrl);
        if (direct)
          return { name: "MaxStream", url: direct, quality: "AUTO" };
        return null;
      }
      if (u.indexOf("mixdrop") !== -1) {
        const direct = yield extractMixDrop(mirrorUrl);
        if (direct)
          return { name: "MixDrop", url: direct, quality: "AUTO" };
        return null;
      }
      console.log("[Extractor] Unsupported mirror host: " + mirrorUrl);
    } catch (e) {
      console.error("[Extractor] Failed for " + mirrorUrl + ": " + e.message);
    }
    return null;
  });
}

// src/onlineserietv/index.js
var MAIN_URL = "https://onlineserietv.com";
function bypassUprot(link) {
  return __async(this, null, function* () {
    const updatedLink = link.indexOf("msf") !== -1 ? link.replace("msf", "mse") : link;
    try {
      const html = yield fetchText(updatedLink);
      const $ = loadHtml(html);
      const href = $("a").first().attr("href");
      return href ? fixUrl(href, updatedLink) : null;
    } catch (e) {
      console.error("[OnlineSerieTV] uprot bypass failed: " + e.message);
      return null;
    }
  });
}
function getMovieLinks($) {
  const links = [];
  $("#hostlinks").find("a").each((i, el) => {
    const href = $(el).attr("href");
    if (href)
      links.push(href);
  });
  return links;
}
function getEpisodeLinks($) {
  const table = $("#hostlinks table").first();
  const map = {};
  let currentSeason = 1;
  table.find("tr").each((i, row) => {
    const $row = $(row);
    const cells = $row.find("td");
    if (cells.length === 0)
      return;
    if (cells.length === 1) {
      const seasonText = $row.find("td:nth-child(1)").text().replace(" - Episodi disponibili", "");
      const m = seasonText.match(/\d+/);
      if (m)
        currentSeason = parseInt(m[0], 10);
      return;
    }
    const title = $row.find("td:nth-child(1)").text().trim();
    const xIdx = title.indexOf("x");
    if (xIdx === -1)
      return;
    const epNumber = parseInt(title.slice(xIdx + 1).split(" ")[0], 10);
    if (isNaN(epNumber))
      return;
    const links = [];
    $row.find("a").each((j, a) => {
      const href = $(a).attr("href");
      if (href)
        links.push(href);
    });
    if (links.length === 0)
      return;
    if (!map[currentSeason])
      map[currentSeason] = {};
    map[currentSeason][epNumber] = (map[currentSeason][epNumber] || []).concat(links);
  });
  return map;
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const seasonNum = season || 1;
      const episodeNum = episode || 1;
      console.log("[OnlineSerieTV] Request: " + mediaType + " " + tmdbId + (mediaType === "tv" ? " S" + seasonNum + "E" + episodeNum : ""));
      const details = yield fetchTmdbDetails(tmdbId, mediaType);
      if (!details || !details.title) {
        console.log("[OnlineSerieTV] No TMDB details");
        return [];
      }
      const wantTv = mediaType === "tv";
      const searchHtml = yield fetchText(MAIN_URL + "/?s=" + encodeURIComponent(details.title));
      const $search = loadHtml(searchHtml);
      const results = [];
      $search("#box_movies .movie").each((i, el) => {
        const node = $search(el);
        const href = node.find("a").first().attr("href");
        let title = node.find("h2").text().trim();
        if (!href || !title)
          return;
        title = title.replace(/\s*\d{4}\s*$/, "");
        results.push({ title, url: fixUrl(href, MAIN_URL), text: node.text() });
      });
      console.log("[OnlineSerieTV] Search results: " + results.length);
      const target = pickBestResult(results, details, wantTv);
      if (!target) {
        console.log('[OnlineSerieTV] No matching page for "' + details.title + '"');
        return [];
      }
      console.log("[OnlineSerieTV] Matched: " + target.title + " -> " + target.url);
      const pageHtml = yield fetchText(target.url);
      const $ = loadHtml(pageHtml);
      let links = [];
      const isMoviePage = target.url.indexOf("/film/") !== -1;
      if (isMoviePage && !wantTv) {
        links = getMovieLinks($);
      } else if (!isMoviePage && wantTv) {
        const episodeMap = getEpisodeLinks($);
        const seasonEntry = episodeMap[seasonNum] || {};
        links = seasonEntry[episodeNum] || [];
        if (links.length === 0) {
          const keys = Object.keys(seasonEntry);
          if (keys.length > 0)
            links = seasonEntry[keys[0]] || [];
        }
      } else {
        links = getMovieLinks($);
        if (links.length === 0) {
          const episodeMap = getEpisodeLinks($);
          const seasonEntry = episodeMap[seasonNum] || {};
          links = seasonEntry[episodeNum] || [];
        }
      }
      if (links.length === 0) {
        console.log("[OnlineSerieTV] No host links found");
        return [];
      }
      console.log("[OnlineSerieTV] Host links: " + links.length);
      const streams = [];
      const seen = {};
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (link.indexOf("uprot") === -1)
          continue;
        const bypassed = yield bypassUprot(link);
        if (!bypassed)
          continue;
        if (seen[bypassed])
          continue;
        seen[bypassed] = true;
        console.log("[OnlineSerieTV] Bypassed: " + bypassed);
        const resolved = yield resolveMirror(bypassed, "OnlineSerieTV");
        if (resolved) {
          streams.push({
            name: resolved.name,
            title: "OnlineSerieTV - " + resolved.name,
            url: resolved.url,
            quality: resolved.quality,
            headers: {}
          });
        }
      }
      console.log("[OnlineSerieTV] Streams found: " + streams.length);
      return streams;
    } catch (error) {
      console.error("[OnlineSerieTV] Error: " + error.message);
      return [];
    }
  });
}
module.exports = { getStreams };
