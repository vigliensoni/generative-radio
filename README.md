# Generative radio

A browser module that generates music by playing sounds hosted on [Freesound](http://freesound.org/).

## Installation

`npm i dimitriaatos/generative-radio`

(You'll have to have [node](https://nodejs.org/) and [git](https://git-scm.com/downloads) installed)

## Try

```bash
git clone https://github.com/dimitriaatos/generative-radio.git
cd generative-radio
npm i
echo "TOKEN=[API token]" > .env
npm test
```

Replace `[API token]` with a Freesound API token, you can get one on <https://freesound.org/apiv2/apply/>.

## Use

`index.js`

```javascript
import GenerativeRadio from 'generative-radio'
import pieces from './pieces'

const gen = new GenerativeRadio(pieces)

gen.token = '[API token]'

// gen.play() should be called after a user gesture (e.g. a click).
document.addEventListener('click', () => { gen.play() })
```

`pieces.js`

```javascript
export {
  pieces: [
    {
      elements:[
        {
          search: { text: 'rain' },//play a raining sounds
          structure: { metro: 2 } // every 2 seconds
        },
        {
          search: {
            text: 'scream',
            options: {
              results: 50,
              filter: { duration: [0, 60] }, // [min, max] (seconds)
              sort: 'rating_desc' // get the first 50 best rated sounds
            }
          },
          structure: { metro: 10 } // every 10 seconds
        },
      ],
      duration: 10
    },
    {
      elements:[
        {
          search: {
            sound: 339809, // sound id
            options: {
              filter: { duration: [0, '*'] } // no upper limit
            }
          },
          structure: {
            metro: 1,
            fade: 0.2 // sound duration percentage to be faded in and out (max: 0.5)
          }
        },
        {
          search: { text: 'train' },
          structure: { metro: 2 }
        },
      ],
      duration: 60,
      fade: 30 // duration of the piece's fade in and fade out (added to the total duration)
    }
  ]
}
```

## Default Values

When a field is omitted from the configuration, the following defaults are applied by the code (defined in `src/globals.js`, `src/playElement.js`, and `src/playSound.js`):

| Parameter | Default | Notes |
|---|---|---|
| `search.options.results` | `150` | Capped at 150 by the Freesound API |
| `search.options.filter.duration` | `[0, 60]` | Seconds |
| `search.options.filter.geotag` | *none* | Bounding box `[min_lat, min_lon, max_lat, max_lon]`; only geotagged sounds are returned |
| `search.options.sort` | `"rating_desc"` | Highest rated first |
| `structure.metro` | *none* | Omitting it activates continuous mode |
| `structure.fade` | `0` | No fade; clamped to max `0.5` |
| `structure.mono` | `false` | Polyphonic by default |
| `piece.fade` | `0` | No crossfade between pieces |
| `gen.gain` | `1` | Full volume |
| Sound `maxDuration` | actual sound duration | Capped by `filter.duration[1]` in continuous mode, or by `metro` in mono rhythmic mode |

## Example: Montréal Soundscape

A configuration that evokes the sonic character of Montréal using geolocation filtering. The `geotag` bounding box `[45.45, -73.70, 45.58, -73.50]` restricts results to sounds recorded on the island of Montréal. Elements that are less likely to have geotagged results (e.g., "ice cracking") omit the geotag and rely on text search alone.

`montreal.json`

```json
{
  "pieces": [
    {
      "elements": [
        {
          "search": {
            "text": "church bells city",
            "options": {
              "results": 80,
              "filter": {
                "duration": [5, 30],
                "geotag": [45.45, -73.70, 45.58, -73.50]
              }
            }
          },
          "structure": { "metro": 20, "fade": 0.3 }
        },
        {
          "search": {
            "text": "park birds",
            "options": {
              "results": 100,
              "filter": {
                "duration": [15, 45],
                "geotag": [45.45, -73.70, 45.58, -73.50]
              }
            }
          },
          "structure": { "fade": 0.15 }
        },
        {
          "search": {
            "text": "traffic urban",
            "options": {
              "results": 60,
              "filter": {
                "duration": [10, 40],
                "geotag": [45.45, -73.70, 45.58, -73.50]
              }
            }
          },
          "structure": { "fade": 0.2 }
        }
      ],
      "duration": 180,
      "fade": 25
    },
    {
      "elements": [
        {
          "search": {
            "text": "subway metro underground",
            "options": {
              "results": 100,
              "filter": {
                "duration": [5, 25],
                "geotag": [45.45, -73.70, 45.58, -73.50]
              }
            }
          },
          "structure": { "metro": 12, "fade": 0.25, "mono": true }
        },
        {
          "search": {
            "text": "footsteps crowd",
            "options": {
              "results": 80,
              "filter": {
                "duration": [3, 15],
                "geotag": [45.45, -73.70, 45.58, -73.50]
              }
            }
          },
          "structure": { "metro": 6, "fade": 0.15 }
        },
        {
          "search": {
            "text": "urban ambience cafe",
            "options": {
              "results": 60,
              "filter": {
                "duration": [20, 60],
                "geotag": [45.45, -73.70, 45.58, -73.50]
              }
            }
          },
          "structure": { "fade": 0.1 }
        }
      ],
      "duration": 150,
      "fade": 20
    },
    {
      "elements": [
        {
          "search": {
            "text": "winter wind cold",
            "options": {
              "results": 80,
              "filter": { "duration": [15, 60] }
            }
          },
          "structure": { "fade": 0.2 }
        },
        {
          "search": {
            "text": "snow footsteps walking",
            "options": {
              "results": 60,
              "filter": { "duration": [3, 12] }
            }
          },
          "structure": { "metro": 5, "fade": 0.2, "mono": true }
        },
        {
          "search": {
            "text": "ice cracking frozen",
            "options": {
              "results": 40,
              "filter": { "duration": [1, 8] }
            }
          },
          "structure": { "metro": 15, "fade": 0.3 }
        }
      ],
      "duration": 120,
      "fade": 30
    }
  ]
}
```

The three pieces cycle in random order: a summer daytime scene (bells, birds, traffic — geotagged to Montréal), an underground/indoor urban scene (métro, crowds, café — also geotagged), and a winter scene (wind, snow, ice — text search only, since these sounds are rarely geotagged). Each fades smoothly into the next.

## Documentation

See [USAGE.md](./USAGE.md) for a full guide covering the API, configuration schema, playback modes, audio architecture, and advanced usage.
