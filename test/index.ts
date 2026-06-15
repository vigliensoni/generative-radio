import Generative from '../dist/src/index'
// import pieces from './pieces-montreal.json'
// import pieces from './pieces-palestine.json'
import pieces from './pieces-war-zones.json'

const gen = new Generative(pieces)

fetch(window.location.origin+'/token')
	.then((response) => response.text())
	.then((token) => { gen.token = token })

gen.debug = false

const MAX_LINES = 12

const geotagToLocation = (geotag: string | null): string => {
	if (!geotag) return ''
	const [lat, lon] = geotag.split(' ').map(Number)
	if (lat >= 31 && lat <= 33 && lon >= 34 && lon <= 36) return 'Palestine'
	if (lat >= 44 && lat <= 53 && lon >= 22 && lon <= 41) return 'Ukraine'
	if (lat >= 8 && lat <= 23 && lon >= 21 && lon <= 39) return 'Sudan'
	if (lat >= 12 && lat <= 19 && lon >= 42 && lon <= 55) return 'Yemen'
	if (lat >= 9 && lat <= 29 && lon >= 92 && lon <= 102) return 'Myanmar'
	if (lat >= 32 && lat <= 38 && lon >= 35 && lon <= 43) return 'Syria'
	if (lat >= 5 && lat <= 16 && lon >= 32 && lon <= 48) return 'Ethiopia'
	if (lat >= -6 && lat <= 3 && lon >= 26 && lon <= 32) return 'DR Congo'
	return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
}

const geotagToCoords = (geotag: string | null): string => {
	if (!geotag) return ''
	const [lat, lon] = geotag.split(' ').map(Number)
	return `${lat.toFixed(4)}°  ${lon.toFixed(4)}°`
}

const logContainer = document.getElementById('logContainer')!
const nowLocation = document.getElementById('nowLocation')!

const addLogLine = (name: string, query: string, location: string, coords: string, duration: string) => {
	// mark previous lines as fading
	const existing = logContainer.querySelectorAll('.log-line:not(.fading)')
	existing.forEach((el) => el.classList.add('fading'))

	const line = document.createElement('div')
	line.className = 'log-line'

	const locationPart = location ? `<span class="location-tag">${location}</span> ` : ''
	const coordsPart = coords ? `<span class="coords-tag">${coords}</span> ` : ''
	const searchPart = `<span class="search-tag">${query}</span>`
	const durationPart = `<span class="duration-tag">${duration}s</span>`

	line.innerHTML = `
		<span class="sound-name">${name}</span>
		<span class="sound-meta">${locationPart}${coordsPart}${searchPart} ${durationPart}</span>
	`
	logContainer.appendChild(line)

	// update location display
	if (location) {
		nowLocation.textContent = location
		nowLocation.classList.add('active')
	}

	// trim old lines
	const lines = logContainer.querySelectorAll('.log-line')
	if (lines.length > MAX_LINES) {
		const toRemove = lines.length - MAX_LINES
		for (let i = 0; i < toRemove; i++) {
			lines[i].remove()
		}
	}
}

gen.ontrigger = ({sound, searchInfo}) => {
	if (sound) {
		const query = searchInfo?.text || `similar to #${searchInfo?.sound}`
		const location = geotagToLocation(sound.geotag)
		const coords = geotagToCoords(sound.geotag)
		const duration = sound.duration.toFixed(1)

		// HTML log
		addLogLine(sound.name, query, location, coords, duration)

		// Console log
		const locStr = location || 'no geotag'
		const coordsStr = sound.geotag ? `[${sound.geotag}]` : '[—]'
		console.log(`Playing: "${sound.name}" | search: "${query}" | ${locStr} ${coordsStr} | ${duration}s`)
	}
}

const overlay = document.getElementById('overlay')!
const player = document.getElementById('player')!

document.getElementById('startBtn')!.addEventListener('click', () => {
	overlay.classList.add('hidden')
	setTimeout(() => player.classList.add('visible'), 500)
	gen.play()
})

document.getElementById('stopBtn')!.addEventListener('click', () => {
	gen.stop()
	overlay.classList.remove('hidden')
	player.classList.remove('visible')
	logContainer.innerHTML = ''
	nowLocation.textContent = ''
	nowLocation.classList.remove('active')
})

document.getElementById('volume')!
	.addEventListener('input', (event) => { gen.gain = (event.target as HTMLInputElement).value })

// Fullscreen
const fullscreenBtn = document.getElementById('fullscreenBtn')!

const toggleFullscreen = () => {
	if (!document.fullscreenElement) {
		document.documentElement.requestFullscreen().catch(() => {})
		fullscreenBtn.classList.add('is-fullscreen')
	} else {
		document.exitFullscreen()
		fullscreenBtn.classList.remove('is-fullscreen')
	}
}

fullscreenBtn.addEventListener('click', toggleFullscreen)

document.addEventListener('fullscreenchange', () => {
	if (!document.fullscreenElement) {
		fullscreenBtn.classList.remove('is-fullscreen')
	}
})
