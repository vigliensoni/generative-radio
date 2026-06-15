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
gen.token = 'YOUR_FREESOUND_API_TOKEN'
```

### 3. Start playback

Playback must be triggered from a user gesture (browser autoplay policy):

```javascript
document.querySelector('#play').addEventListener('click', () => {
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
| `gen.debug = value` | `boolean` | Enables console logging of the playback lifecycle. |
| `gen.ontrigger = fn` | `function` | Callback fired every time a sound starts or ends. Receives `{ sound, numPlayers }`. |
| `gen.playing` | `boolean` (read-only) | Whether playback is currently active. |

### Methods

| Method | Description |
|---|---|
| `gen.play(pieces?)` | Start playback. Optionally pass a new pieces array to replace the current set. |
| `gen.stop()` | Stop all playback immediately. |

### The `ontrigger` callback

```javascript
gen.ontrigger = ({ sound, numPlayers }) => {
  // sound: metadata object of the sound that just started (or undefined on end)
  // numPlayers: number of sounds currently playing
  console.log(`Now playing: ${sound?.name} — ${numPlayers} active voices`)
}
```

This is useful for building reactive UIs that display what's currently playing.

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
| `search.options.sort` | `string` | `"rating_desc"` | Sort order for results. Highest rated first by default. |
| `search.options.tags` | `string` | — | Filter results by Freesound tags. Optional. |

These defaults are defined in `src/globals.js` and merged into every element via `deepMerge` before the Freesound query is made, so any field you omit falls back to the values above.

#### Geolocation filtering

Many sounds on Freesound are geotagged by their uploaders with the coordinates of the recording location. The `geotag` filter lets you restrict results to sounds recorded within a geographic bounding box, defined as `[min_lat, min_lon, max_lat, max_lon]` in decimal degrees.

For example, to fetch only sounds recorded in Montréal:

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

Note that geotag filtering only returns sounds whose uploaders chose to tag their location, so the result pool will typically be smaller than a text-only search. You can combine `geotag` with `text` and `duration` filters freely — all filters are ANDed together.

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

## Audio Signal Chain

The Web Audio API graph is structured as a chain of gain nodes, each providing independent volume and fade control:

```
Sound GainNode → Piece GainNode → Master GainNode → AudioContext.destination
   (per sound)      (per piece)      (gen.gain)           (speakers)
```

Fades at every level use `exponentialRampToValueAtTime` for smooth, perceptually even transitions.

## Piece Sequencing

Pieces play in a shuffled order using a no-repetition algorithm — the same piece won't play twice in a row. When a piece ends (after its `duration + 2 × fade`), the next one is selected and begins loading. The sequence loops indefinitely until `gen.stop()` is called.

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

## Running the Test Environment

```bash
git clone https://github.com/dimitriaatos/generative-radio.git
cd generative-radio
npm install
echo "TOKEN=YOUR_API_TOKEN" > .env
npm test
```

This starts a local server at `http://localhost:3000` with a minimal UI (play/stop buttons and a volume slider).

## Development

```bash
npm run build    # compile TypeScript once
npm run dev      # watch mode — recompile on changes
```
