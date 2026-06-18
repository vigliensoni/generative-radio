import Generative from '../dist/src/index'
// import rawPieces from './pieces-montreal.json'
// import rawPieces from './pieces-palestine.json'
// import rawPieces from './pieces-war-zones.json'
import rawPieces from './pieces-war-zones-2.json'

const resolveLocations = (config: any) => {
	const locs: Record<string, number[]> = config._locations || {}
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

const gen = new Generative(resolveLocations(rawPieces))

const startBtn = document.getElementById('startBtn') as HTMLButtonElement
startBtn.disabled = true

fetch(window.location.origin+'/token')
	.then((response) => {
		if (!response.ok) throw new Error(`token fetch failed: ${response.status}`)
		return response.text()
	})
	.then((token) => {
		const trimmed = token.trim()
		if (!trimmed) throw new Error('token is empty — check TOKEN in .env')
		gen.token = trimmed
		startBtn.disabled = false
		console.log('token loaded, ready to play')
	})
	.catch((err) => {
		console.error(err)
		startBtn.textContent = 'Token error — check console'
	})

gen.debug = true

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
	if (lat >= -56 && lat <= -17.5 && lon >= -75.5 && lon <= -66) return 'Chile'
	return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
}

const geotagToCoords = (geotag: string | null): string => {
	if (!geotag) return ''
	const [lat, lon] = geotag.split(' ').map(Number)
	return `${lat.toFixed(4)}°  ${lon.toFixed(4)}°`
}

const logContainer = document.getElementById('logContainer')!

interface SoundEntry {
	line: HTMLElement
	fill: HTMLElement
	startTime: number
	duration: number
}

const activeSounds = new Map<any, SoundEntry>()
let rafId: number | null = null

const tickProgress = () => {
	const now = performance.now()
	for (const entry of activeSounds.values()) {
		const pct = Math.min((now - entry.startTime) / (entry.duration * 1000), 1) * 100
		entry.fill.style.width = `${pct}%`
	}
	rafId = requestAnimationFrame(tickProgress)
}

const exitLine = (el: HTMLElement) => {
	el.classList.add('exiting')
	setTimeout(() => el.remove(), 2000)
}

const showSound = (sound: any, query: string, location: string, coords: string, duration: string, playDuration: number, tags: string[], username: string, url: string, license: string, created: string) => {
	const line = document.createElement('div')
	line.className = 'log-line'

	const locationPart = location ? `<span class="location-tag">${location}</span> ` : ''
	const coordsPart = coords ? `<span class="coords-tag">${coords}</span> ` : ''
	const searchPart = `<span class="search-tag">${query}</span>`
	const durationPart = `<span class="duration-tag">${duration}s</span>`
	const userPart = username ? ` · <span class="username-tag">by ${username}</span>` : ''
	const yearPart = created ? ` · <span class="year-tag">${created.slice(0, 4)}</span>` : ''
	const licensePart = license ? ` · <span class="license-tag">${license.replace(/https?:\/\/creativecommons\.org\/publicdomain\/.*/, 'CC0').replace(/https?:\/\/creativecommons\.org\/licenses\//, 'CC ').replace(/\/.*/, '').toUpperCase()}</span>` : ''

	const nameHtml = url
		? `<a class="sound-name" href="${url}" target="_blank" rel="noopener">${sound.name}</a>`
		: `<span class="sound-name">${sound.name}</span>`

	const tagsPart = tags && tags.length > 0
		? `<span class="sound-tags">${tags.map(t => `<span class="tag">${t}</span>`).join('')}</span>`
		: ''

	line.innerHTML = `
		${nameHtml}
		<span class="sound-meta">${locationPart}${coordsPart}${searchPart} ${durationPart}${userPart}${yearPart}${licensePart}</span>
		${tagsPart}
		<div class="progress-bar"><div class="progress-fill"></div></div>
	`
	logContainer.appendChild(line)

	const fill = line.querySelector('.progress-fill') as HTMLElement
	activeSounds.set(sound, {line, fill, startTime: performance.now(), duration: playDuration})

}

const clearSound = (sound: any) => {
	const entry = activeSounds.get(sound)
	if (!entry) return
	activeSounds.delete(sound)
	exitLine(entry.line)
}

gen.ontrigger = ({sound, searchInfo, ended, maxDuration}) => {
	if (sound && !ended) {
		const query = searchInfo?.text || `similar to #${searchInfo?.sound}`
		const location = geotagToLocation(sound.geotag)
		const coords = geotagToCoords(sound.geotag)
		const duration = sound.duration.toFixed(1)
		const playDuration: number = maxDuration ?? sound.duration
		const tags: string[] = sound.tags || []
		const username: string = sound.username || ''
		const url: string = sound.url || ''
		const license: string = sound.license || ''
		const created: string = sound.created || ''

		showSound(sound, query, location, coords, duration, playDuration, tags, username, url, license, created)

		const locStr = location || 'no geotag'
		const coordsStr = sound.geotag ? `[${sound.geotag}]` : '[—]'
		const tagsStr = tags.length > 0 ? ` | tags: ${tags.join(', ')}` : ''
		console.log(`Playing: "${sound.name}" | search: "${query}" | ${locStr} ${coordsStr} | ${duration}s | by ${username}${tagsStr}`)
	} else if (ended && sound) {
		clearSound(sound)
	}
}

const overlay = document.getElementById('overlay')!
const player = document.getElementById('player')!

startBtn.addEventListener('click', () => {
	overlay.classList.add('hidden')
	setTimeout(() => player.classList.add('visible'), 500)
	gen.play()
	if (!rafId) rafId = requestAnimationFrame(tickProgress)
})

document.getElementById('stopBtn')!.addEventListener('click', () => {
	gen.stop()
	if (rafId) { cancelAnimationFrame(rafId); rafId = null }
	overlay.classList.remove('hidden')
	player.classList.remove('visible')
	logContainer.innerHTML = ''
	activeSounds.clear()
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
