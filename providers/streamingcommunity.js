/**
 * streamingcommunity - Built from src/streamingcommunity/
 * Generated: 2026-10-04T18:28:10.313Z
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

// src/streamingcommunity/util.js
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

// src/streamingcommunity/vixsrc.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
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
function resolveEmbedUrl(pageUrl) {
  return __async(this, null, function* () {
    const m = pageUrl.match(/^(https?:\/\/[^\/]+)\/(movie|tv)\/([^?#]*)(\?[^#]*)?/);
    if (!m) {
      console.log("[VixSrc] Unrecognized page URL: " + pageUrl);
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
function extractVixSrc(pageOrEmbedUrl) {
  return __async(this, null, function* () {
    let embedUrl = pageOrEmbedUrl;
    if (embedUrl.indexOf("/embed/") === -1) {
      embedUrl = yield resolveEmbedUrl(pageOrEmbedUrl);
      if (!embedUrl)
        return null;
    }
    const html = yield fetchText(embedUrl, { headers: VIXSRC_HEADERS });
    const $ = import_cheerio_without_node_native.default.load(html);
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
      console.log("[VixSrc] No masterPlaylist script found on " + embedUrl);
      return null;
    }
    const json = parseWindowObject(scriptData);
    const mp = json && json.masterPlaylist;
    if (!mp || !mp.url || !mp.params) {
      console.log("[VixSrc] masterPlaylist missing or empty (title may be unavailable)");
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

// src/streamingcommunity/index.js
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/133.0";
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log("[StreamingCommunity] Request: " + mediaType + " " + tmdbId + (mediaType === "tv" ? " S" + (season || 1) + "E" + (episode || 1) : ""));
      const pageUrl = buildVixSrcPageUrl(tmdbId, mediaType, season, episode);
      const playlistUrl = yield extractVixSrc(pageUrl);
      if (!playlistUrl) {
        return [];
      }
      return [{
        name: "VixSrc",
        title: "StreamingCommunity - VixSrc (ITA)",
        url: playlistUrl,
        quality: "AUTO",
        headers: {
          "Referer": VIXSRC_REFERER,
          "User-Agent": UA
        }
      }];
    } catch (error) {
      console.error("[StreamingCommunity] Error: " + error.message);
      return [];
    }
  });
}
module.exports = { getStreams };
