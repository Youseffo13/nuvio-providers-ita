# Nuvio Providers ITA 🇮🇹

Provider per l'app **[Nuvio](https://github.com/tapframe/NuvioLovers)** che aggiungono fonti di streaming in italiano per film e serie TV.

I provider sono **porting in JavaScript dei plugin CloudStream di [doGior](https://github.com/doGior) ([doGiorsHadEnough](https://github.com/doGior/doGiorsHadEnough))**, adattati all'interfaccia `getStreams(tmdbId)` di Nuvio e aggiornati ai cambiamenti dei siti.

---

## ⚠️ Disclaimer / Note legali

- **Questa repository è stata creata con l'aiuto dell'ia.** La repo infatti è stata creata grazie all'aiuto di GLM 5.3 Flash.
- **Questa repository non ospita alcun file video, audio o sottotitolo.** Contiene solo codice che individua link già pubblicamente accessibili su siti di terze parti.
- Nessun contenuto è distribuito, archiviato o trasmesso da questa repository o dal suo autore. Il progetto funziona esclusivamente come "motore di ricerca" di link.
- **Per richieste DMCA/rimozione, rivolgiti ai siti che ospitano effettivamente i contenuti.** Il proprietario di questa repository non ha alcun controllo sui contenuti di terze parti e non può rimuoverli.
- I siti citati sono soggetti a blocchi legali in alcuni paesi (es. ordinanze AGCOM in Italia). Questo progetto non aggira misure di protezione tecnica: se un sito è irraggiungibile, il provider semplicemente non restituisce risultati.
- L'uso è pensato a scopo **personale e di studio**. L'utente è l'unico responsabile del rispetto delle leggi sul diritto d'autore del proprio paese. L'autore non si assume alcuna responsabilità per l'uso fatto del codice.
- Software fornito **senza alcuna garanzia**, licenza GPL-3.0 (vedi [LICENSE](LICENSE)).

---

## Provider disponibili

| Provider | Contenuti | Lingua | Stato | Note |
|---|---|:---:|:---:|---|
| **StreamingCommunity** | Film, Serie TV | 🇮🇹 | ✅ | Via VixSrc, risoluzione diretta dal TMDB ID |
| **AltaDefinizione** | Film, Serie TV | 🇮🇹 | ✅ | Ricerca sul sito + player VixSrc (imdb) |
| **OnlineSerieTV** | Serie TV | 🇮🇹 | ❌ | Sito attualmente bloccato AGCOM, provider disabilitato |

## Installazione

### 1. Aggiungi la repository a Nuvio

1. Apri **Nuvio → Settings → Plugins**
2. Incolla questo URL e conferma:
   ```
   https://raw.githubusercontent.com/Youseffo13/nuvio-providers-ita/main/manifest.json
   ```
3. Attiva i provider che vuoi dalla lista

### 2. Test in locale (sviluppatori)

Serve la **build di sviluppo** di Nuvio (debug APK o `npx expo run:android`).

```bash
npm install
npm start          # server su http://<tuo-ip>:3000
```

In Nuvio: **Settings → Developer → Plugin Tester**
- Repo Tester → `http://<tuo-ip>:3000/manifest.json` → Fetch Manifest → Test All
- Provider singolo → `http://<tuo-ip>:3000/providers/streamingcommunity.js`

## Sviluppo

```
src/<provider>/          # sorgenti (modifica qui)
providers/<provider>.js  # bundle compilato (NON modificare a mano)
manifest.json            # registro dei provider (formato { name, version, scrapers[] })
build.js                 # build + transpile async/await per Hermes
```

```bash
node build.js streamingcommunity altadefinizione onlineserietv   # compila
node build.js                                                    # compila tutto
npm run build:watch                                              # watch mode
```

### Test live

```bash
node test-live.js streamingcommunity 550 movie          # Fight Club
node test-live.js altadefinizione 1396 tv 1 1           # Breaking Bad S1E1
node test-unpacker.js                                   # test offline unpacker
```

### Come funziona il port

- **StreamingCommunity**: TMDB ID → API vixsrc → pagina `/embed/` → parsing `window.masterPlaylist` → playlist m3u8
- **AltaDefinizione**: TMDB → titolo italiano → ricerca sul sito → imdb ID → API vixsrc → playlist
- **OnlineSerieTV**: TMDB → ricerca → tabella episodi → bypass link uprot → StreamTape/MaxStream

## Crediti

- **[doGior](https://github.com/doGior)** — logica originale dei provider CloudStream ([doGiorsHadEnough](https://github.com/doGior/doGiorsHadEnough)), licenza GPL-3.0
- **[tapframe](https://github.com/tapframe)** — app Nuvio e template provider
- **[yoruix](https://github.com/yoruix)** — repository provider Nuvio di riferimento per convenzioni e formato manifest

## Licenza

**GPL-3.0** — vedi [LICENSE](LICENSE). I port derivano da codice GPL: questa repository è quindi anch'essa interamente GPL-3.0.
