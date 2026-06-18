# Generative Radio — Usage Guide

A browser module that generates music by retrieving and playing sounds from [Freesound](https://freesound.org/). Sounds are fetched via the Freesound API and played back through the Web Audio API in layered, crossfading arrangements defined by a JSON configuration.

## Installation

```bash
npm i dimitriaatos/generative-radio
```

Requires [Node.js](https://nodejs.org/) and [Git](https://git-scm.com/downloads).

## Quick Start

### 1. Get a Freesound API token

Register at <https://freesound.org/apiv2/apply/> to obtain an API token.

### 2. Import and instantiate

```javascript
import GenerativeRadio from 'generative-radio'
import pieces from './pieces.json'

const gen = new GenerativeRadio(pieces)
```

### 3. Load the token before enabling playback

The Freesound API token must be set before `play()` is called. Fetch it asynchronously and disable the play button until it's ready to avoid a race condition that causes 401 errors:

```javascript
const playBtn = document.querySelector('#play')
playBtn.disabled = true

fetch('/token')
  .then(r => { if (!r.ok) throw new Error(r.status); return r.text() })
  .then(token => {
    gen.token = token.trim()
    playBtn.disabled = false
  })
  .catch(err => console.error('Token fetch failed:', err))
```

### 4. Start playback

Playback must be triggered from a user gesture (browser autoplay policy):

```javascript
playBtn.addEventListener('click', () => {
  gen.play()
})
```

### 4. Stop playback

```javascript
gen.stop()
```

## API Reference

### Constructor

```javascript
const gen = new GenerativeRadio(pieces)
```

`pieces` is a JSON object containing a `pieces` array (see "Configuration Schema" below).

### Properties and setters

| Setter / Getter | Type | Description |
|---|---|---|
| `gen.token = value` | `string` | Sets the Freesound API token. Required before calling `play()`. |
| `gen.gain = value` | `number` (0–1) | Sets the master output volume. |
| `gen.debug = value` | `boolean` | Enables verbose console logging of loading and playback (see Debug Logging below). |
| `gen.negativeTags = value` | `string[]` | Global list of Freesound tags to exclude from every search. Any sound that carries at least one of these tags is removed from the result pool. Applied client-side after fetching, so it does not affect the API query. Combined with any per-element `filter.negativeTags`. |
| `gen.ontrigger = fn` | `function` | Callback fired every time a sound starts or ends. Receives `{ sound, searchInfo, ended, maxDuration, numPlayers }`. |
| `gen.playing` | `boolean` (read-only) | Whether playback is currently active. |

### Methods

| Method | Description |
|---|---|
| `gen.play(pieces?)` | Start playback. Optionally pass a new pieces array to replace the current set. |
| `gen.stop()` | Stop all playback immediately. |

### The `ontrigger` callback

Fired every time a sound starts or ends. Receives a single object:

| Property | Type | Description |
|---|---|---|
| `sound` | `object` | Freesound metadata for the sound (name, duration, geotag, tags, username, url, license, created, previews). |
| `searchInfo` | `object` | The search query that found this sound: `{ text }` for text searches or `{ sound }` for similar-sound searches. |
| `ended` | `boolean` | `true` when the sound has finished; `false` (or absent) when it starts. |
| `maxDuration` | `number` | How long the sound will actually play, in seconds (may be shorter than the sound's full duration due to `metro` or duration filters). |
| `numPlayers` | `number` | Number of sounds currently playing (including this one on start; excluding it on end). |

```javascript
gen.ontrigger = ({ sound, searchInfo, ended, maxDuration, numPlayers }) => {
  if (sound && !ended) {
    console.log(`▶ "${sound.name}" | search: "${searchInfo?.text}" | ${maxDuration.toFixed(1)}s | ${numPlayers} voices`)
  } else if (ended && sound) {
    console.log(`■ "${sound.name}" ended`)
  }
}
```

This is useful for building reactive UIs that display what's currently playing, with per-sound progress tracking.

## Configuration Schema

The configuration is a JSON object with one top-level key, `pieces`, containing an array of piece objects.

```json
{
  "pieces": [ ...piece objects... ]
}
```

### Piece

A piece is a timed group of elements that play together, then crossfade into the next piece.

| Field | Type | Default | Description |
|---|---|---|---|
| `elements` | `array` | — | Array of element objects (required). |
| `duration` | `number` | — | How long the piece plays, in seconds (required). Does not include fade time. |
| `fade` | `number` | `0` | Duration in seconds of the fade-in and fade-out at piece boundaries. This time is added on top of `duration`, so total piece time = `fade + duration + fade`. If `0` or omitted, pieces start and end abruptly. |

### Element

An element defines a single sound layer within a piece — what sounds to fetch and how to play them.

```json
{
  "search": { ... },
  "structure": { ... }
}
```

#### `search` — what sounds to retrieve

| Field | Type | Default | Description |
|---|---|---|---|
| `search.text` | `string` | — | Text query sent to the Freesound search API. Use this **or** `search.sound`, not both. |
| `search.sound` | `number` | — | A Freesound sound ID. Retrieves sounds similar to this one. Use this **or** `search.text`, not both. |
| `search.options.results` | `number` | `150` | Number of sounds to fetch. Capped at 150 by the Freesound API. |
| `search.options.filter.duration` | `[min, max]` | `[0, 60]` | Duration range in seconds. Use `"*"` for no upper limit, e.g. `[0, "*"]`. |
| `search.options.filter.geotag` | `[min_lat, min_lon, max_lat, max_lon]` | — | Bounding box for geolocation filtering. Only returns sounds that were geotagged within this rectangle. Coordinates are decimal degrees (WGS 84). |
| `search.options.filter.geotags` | `array` | — | Array of bounding boxes (each `[min_lat, min_lon, max_lat, max_lon]`). One parallel search is fired per entry and results are merged. Use this to search across multiple locations simultaneously. Requires the `resolveLocations` pre-processing step if using named strings (see below). |
| `search.options.filter.negativeTags` | `string[]` | — | Tags to exclude from this element's sound pool. Any sound carrying at least one of these tags is removed after fetching. Applied client-side; does not affect the API query. Merged with the global `gen.negativeTags` list at runtime. |
| `search.options.sort` | `string` | `"rating_desc"` | Sort order for results. Highest rated first by default. |
| `search.options.tags` | `string` | — | Filter results by Freesound tags. Optional. |

These defaults are defined in `src/globals.js` and merged into every element via `deepMerge` before the Freesound query is made, so any field you omit falls back to the values above.

#### Geolocation filtering

Many sounds on Freesound are geotagged by their uploaders with the coordinates of the recording location. Two geolocation fields are supported:

**`geotag`** — a single bounding box `[min_lat, min_lon, max_lat, max_lon]` in decimal degrees. Only returns sounds recorded within that rectangle.

```json
{
  "search": {
    "text": "ambience",
    "options": {
      "filter": {
        "duration": [5, 30],
        "geotag": [45.45, -73.70, 45.58, -73.50]
      }
    }
  },
  "structure": { "fade": 0.15 }
}
```

**`geotags`** — an array of bounding boxes. One parallel Freesound search is fired per entry and all results are merged into a single pool. Use this to search across multiple regions simultaneously.

```json
{
  "search": {
    "text": "birds nature",
    "options": {
      "filter": {
        "duration": [10, 60],
        "geotags": [
          [31.0, 34.0, 33.0, 36.0],
          [44.0, 22.0, 53.0, 41.0]
        ]
      }
    }
  }
}
```

**Fallback behavior** — because geotag coverage on Freesound is sparse, a location-specific search often returns fewer sounds than needed. When results fall below the minimum threshold (`MIN_SOUNDS = 10`):

- For `geotag`: the geotag filter is removed and the same text search runs globally.
- For `geotags`: a broad fallback search (`"recording"`) is run within the *same geotag bounding boxes*, so sounds always come from the specified locations. A global fallback is never used for `geotags`.

Note that geotag filtering only returns sounds whose uploaders chose to tag their location, so the result pool will typically be smaller than a text-only search.

#### Named locations with `_locations`

To avoid repeating coordinate arrays in every element, you can define a `_locations` dictionary at the top level of your config and reference locations by name inside `geotags` arrays. A `resolveLocations()` pre-processing step (run before passing the config to `GenerativeRadio`) replaces name strings with coordinate arrays.

```json
{
  "_locations": {
    "Palestine": [31.0, 34.0, 33.0, 36.0],
    "Ukraine":   [44.0, 22.0, 53.0, 41.0],
    "Chile":     [-56.0, -75.5, -17.5, -66.0]
  },
  "pieces": [
    {
      "elements": [
        {
          "search": {
            "text": "birds nature",
            "options": {
              "filter": {
                "geotags": ["Palestine", "Ukraine"]
              }
            }
          }
        }
      ]
    }
  ]
}
```

The `resolveLocations` helper (used in the test harness `test/index.ts`):

```typescript
const resolveLocations = (config: any) => {
  const locs = config._locations || {}
  const resolved = JSON.parse(JSON.stringify(config))
  for (const piece of resolved.pieces || []) {
    for (const element of piece.elements || []) {
      const geotags = element.search?.options?.filter?.geotags
      if (Array.isArray(geotags)) {
        element.search.options.filter.geotags = geotags
          .map((g: any) => typeof g === 'string' ? locs[g] : g)
          .filter(Boolean)
      }
    }
  }
  return resolved
}

const gen = new GenerativeRadio(resolveLocations(config))
```

Any location name not found in `_locations` is silently dropped (filtered out).

#### `structure` — how to play them

| Field | Type | Default | Description |
|---|---|---|---|
| `structure.metro` | `number` | — | Trigger interval in seconds. If set, the element runs in **rhythmic mode** (a new sound fires every `metro` seconds). If omitted, the element runs in **continuous mode** (sounds overlap seamlessly in sequence). |
| `structure.fade` | `number` (0–0.5) | `0` | Fraction of the sound's duration used for fade-in and fade-out. `0.2` means the first and last 20% of each sound are faded. Clamped to a maximum of `0.5` in the code. |
| `structure.mono` | `boolean` | `false` | If `true`, only one sound plays at a time within this element (monophonic). Relevant mainly in rhythmic mode. When `mono` is `true` in rhythmic mode, `maxDuration` is capped to `metro` so each sound finishes before the next trigger. |

In continuous mode, the effective `maxDuration` of each sound is the lesser of the sound's actual duration and `search.options.filter.duration[1]` (the upper bound of the duration filter). In rhythmic mono mode, it is the lesser of `metro` and the sound's actual duration.

## Defaults Summary

The following table collects every default value applied by the code when a field is omitted from the configuration. Sources: `src/globals.js` (search defaults), `src/playElement.js` (structure defaults), `src/playSound.js` (sound-level defaults).

| Parameter | Default | Source |
|---|---|---|
| `search.options.results` | `150` | `globals.js` → `defaults.element` |
| `search.options.filter.duration` | `[0, 60]` | `globals.js` → `defaults.element` |
| `search.options.sort` | `"rating_desc"` | `globals.js` → `defaults.element` |
| `structure.metro` | *none* (continuous mode) | `globals.js` → `defaults.element` |
| `structure.fade` | `0` (no fade) | `playElement.js` → clamped to max `0.5` |
| `structure.mono` | `false` (polyphonic) | `playElement.js` |
| `piece.fade` | `0` (no crossfade) | `playPiece.js` |
| `gen.gain` | `1` (full volume) | Web Audio `GainNode` default |
| `gen.debug` | `false` | `globals.js` → `state.debugging` |
| Sound `fadeDuration` | `0` | `playSound.js` |
| Sound `fadeDurationPrec` | `0` | `playSound.js` |
| Sound `maxDuration` | actual sound duration | `playSound.js` |

## Playback Modes

### Continuous mode (no `metro`)

When `structure.metro` is omitted, the element plays sounds back-to-back with smooth crossfades. While one sound is playing, the next one is pre-loaded in the background. The outgoing and incoming sounds overlap during the fade region.

Best for: drones, ambient textures, sustained soundscapes.

```json
{
  "search": { "text": "ocean waves" },
  "structure": { "fade": 0.15 }
}
```

### Rhythmic mode (`metro` is set)

When `structure.metro` is a number, a new sound is triggered every `metro` seconds using `setInterval`. Multiple sounds can overlap unless `mono` is `true`.

Best for: percussive layers, periodic accents, rhythmic patterns.

```json
{
  "search": { "text": "knock" },
  "structure": { "metro": 2, "fade": 0.1, "mono": true }
}
```

### Monophonic vs. polyphonic

In rhythmic mode, setting `mono: true` ensures each new trigger replaces the previous sound. When `mono: false` (the default), sounds accumulate and overlap, creating denser textures as the piece progresses.

## Negative Tag Filtering

Sounds can be excluded from the result pool based on their Freesound tags. Filtering is applied client-side after fetching, so it does not affect the API query or count toward the `results` limit.

Two scopes are available and are merged at runtime:

**Global** — applied to every element in every piece:

```javascript
gen.negativeTags = ['distorted', 'noise', 'clipping']
```

**Per-element** — set in the JSON config under `filter.negativeTags`:

```json
{
  "search": {
    "text": "birds nature",
    "options": {
      "filter": {
        "duration": [10, 60],
        "negativeTags": ["battle", "war", "military", "weapon", "gun", "explosion"]
      }
    }
  }
}
```

Both lists are combined. A sound is excluded if any of its tags matches any tag in either list. Tag matching is case-sensitive and exact (e.g., `"war"` excludes sounds tagged `"war"` but not `"warfare"` — list both if needed).

Because filtering reduces the effective pool size, use `results` values higher than you'd otherwise need, especially when the negative list is long.

## Audio Signal Chain

The Web Audio API graph is structured as a chain of gain nodes, each providing independent volume and fade control:

```
Sound GainNode → Piece GainNode → Master GainNode → AudioContext.destination
   (per sound)      (per piece)      (gen.gain)           (speakers)
```

Fades at every level use `linearRampToValueAtTime` for smooth transitions. (`exponentialRampToValueAtTime` cannot target a value of 0, so linear ramping is used instead.)

## Piece Sequencing

Pieces play in a shuffled order using a no-repetition algorithm — the same piece won't play twice in a row. When a piece ends (after its `duration + fade`), the next one is selected and begins loading. The sequence loops indefinitely until `gen.stop()` is called.

## Sound Selection

Within each element, individual sounds are chosen randomly from the fetched pool using the same no-repetition algorithm. This avoids hearing the same sound twice in a row while still drawing from the full pool over time.

## Lower-Level Exports

For advanced use, the module also exports the internal player classes:

```javascript
import GenerativeRadio, { playPieces, playPiece, playElement } from 'generative-radio'
```

These can be used independently if you want finer-grained control over the playback hierarchy — for instance, playing a single element outside the piece/sequence structure.

## Full Configuration Example

```json
{
  "pieces": [
    {
      "elements": [
        {
          "search": {
            "text": "rain",
            "options": {
              "results": 100,
              "filter": { "duration": [10, 30] },
              "sort": "rating_desc"
            }
          },
          "structure": { "fade": 0.15 }
        },
        {
          "search": {
            "text": "thunder",
            "options": {
              "results": 50,
              "filter": { "duration": [2, 10] },
              "sort": "rating_desc"
            }
          },
          "structure": { "metro": 15, "fade": 0.2 }
        }
      ],
      "duration": 120,
      "fade": 20
    },
    {
      "elements": [
        {
          "search": {
            "sound": 339809,
            "options": {
              "filter": { "duration": [0, "*"] }
            }
          },
          "structure": { "metro": 1, "fade": 0.2 }
        },
        {
          "search": { "text": "birds morning" },
          "structure": { "fade": 0.1 }
        }
      ],
      "duration": 90,
      "fade": 15
    }
  ]
}
```

This configuration defines two pieces that alternate in shuffled order. The first piece layers continuous rain with periodic thunder. The second layers rapid percussive hits (from sounds similar to Freesound #339809) with a continuous bed of birdsong.

## Debug Logging

Set `gen.debug = true` to enable verbose console output during loading and playback. When using `geotags`, the log shows each location being searched and how many sounds each returns:

```
geotag[0] specific search: Intersects(34,31,36,33)   ← Palestine
geotag[1] specific search: Intersects(22,44,41,53)   ← Ukraine
geotag[0] returned 0 sound(s)
geotag[1] returned 0 sound(s)
only 0 sound(s) total, broadening search within all locations
geotag[0] broad fallback: Intersects(34,31,36,33)
geotag[1] broad fallback: Intersects(22,44,41,53)
geotag[0] broad returned 22 sound(s)
geotag[1] broad returned 50 sound(s)
element pool: 72 sound(s) from 2 location(s)
```

This is useful for verifying that all locations are being queried and to diagnose why an element might have a thin sound pool.

## Running the Test Environment

```bash
git clone https://github.com/dimitriaatos/generative-radio.git
cd generative-radio
npm install
echo "TOKEN=YOUR_API_TOKEN" > .env
npm test
```

This starts a local server at `http://localhost:3000` with a minimal UI (play/stop buttons, volume slider, and a live sound log).

**Important:** The webpack bundle is built once on server startup. Any changes to source files or JSON config files require restarting the server (`npm test`) to take effect. If sounds don't match your config edits, restart first.

## Development

```bash
npm run build    # compile TypeScript once
npm run dev      # watch mode — recompile on changes
```
