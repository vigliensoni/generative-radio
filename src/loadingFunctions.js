import {deepMerge, deepClone} from './helpers'
import {defaults, state} from './globals'

const formattingOptions = (options) => {
	options.fields = ['username','name','duration','created','url','license','previews', 'tags', 'geotag'].join(',')
	if (options.filter) {
		if (options.filter.duration) {
			const dur = (i) => {
				if (i == 1 && options.filter.duration[2]) i = 2
				return Number(options.filter.duration[i]) || '*'
			}
			options.filter.duration = `[${dur(0)} TO ${dur(1)}]`
		}
		if (options.filter.geotag) {
			const [minLat, minLon, maxLat, maxLon] = options.filter.geotag
			options.filter.geotag = `"Intersects(${minLon} ${minLat} ${maxLon} ${maxLat})"`
		}
		if (options.results) {
			options.page_size = (options.results > 150) ? 150 : options.results
		}
		const filterString = Object.entries(options.filter)
			.map(([key, value]) => `${key}:${value}`).join(' ')
		options.filter = filterString
	}
	return options
}

const MIN_SOUNDS = 10

const searchSounds = async (element, options) => {
	try {
		if (element.search.text !== undefined) {
			const {results} = await state.freesound.textSearch(
				element.search.text,
				options
			)
			return results
		} else if (element.search.sound !== undefined) {
			const sound = await state.freesound.getSound(element.search.sound)
			const {results} = await sound.getSimilar(options)
			return results
		}
	} catch (e) {
		state.debug && console.warn('		search failed:', e.message || e)
	}
	return []
}

const loadElement = async (element) => {
	if (!element.loaded) {
		element = deepMerge({}, defaults.element, element)
		const hasGeotag = element.search.options && element.search.options.filter && element.search.options.filter.geotag
		const options = formattingOptions(deepClone(element.search.options))

		let sounds = await searchSounds(element, options)

		if (hasGeotag && sounds.length < MIN_SOUNDS) {
			state.debug && console.log(`		geotag returned ${sounds.length} sound(s), retrying without geotag`)
			const fallbackOptions = deepClone(element.search.options)
			delete fallbackOptions.filter.geotag
			const formattedFallback = formattingOptions(fallbackOptions)
			const fallbackSounds = await searchSounds(element, formattedFallback)
			sounds = sounds.concat(fallbackSounds)
		}

		element.sounds = sounds
		element.loaded = true
	}
	return element
}

const loadPiece = async (piece) => {
	if (!piece.loaded) {
		const elementPromises = piece.elements.map((element) => loadElement(element))
		const elements = await Promise.all(elementPromises)
		piece.loaded = true
		piece.elements = elements
	}
	return piece
}

export {formattingOptions, loadElement, loadPiece}
