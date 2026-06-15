"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPiece = exports.loadElement = exports.formattingOptions = void 0;
const helpers_1 = require("./helpers");
const globals_1 = require("./globals");
const formattingOptions = (options) => {
    options.fields = ['username', 'name', 'duration', 'created', 'url', 'license', 'previews', 'tags', 'geotag'].join(',');
    if (options.filter) {
        if (options.filter.duration) {
            const dur = (i) => {
                if (i == 1 && options.filter.duration[2])
                    i = 2;
                return Number(options.filter.duration[i]) || '*';
            };
            options.filter.duration = `[${dur(0)} TO ${dur(1)}]`;
        }
        if (options.filter.geotag) {
            const [minLat, minLon, maxLat, maxLon] = options.filter.geotag;
            options.filter.geotag = `"Intersects(${minLon} ${minLat} ${maxLon} ${maxLat})"`;
        }
        if (options.results) {
            options.page_size = (options.results > 150) ? 150 : options.results;
        }
        const filterString = Object.entries(options.filter)
            .map(([key, value]) => `${key}:${value}`).join(' ');
        options.filter = filterString;
    }
    return options;
};
exports.formattingOptions = formattingOptions;
const MIN_SOUNDS = 10;
const searchSounds = async (element, options) => {
    if (element.search.text !== undefined) {
        const { results } = await globals_1.state.freesound.textSearch(element.search.text, options);
        return results;
    }
    else if (element.search.sound !== undefined) {
        const sound = await globals_1.state.freesound.getSound(element.search.sound);
        const { results } = await sound.getSimilar(options);
        return results;
    }
    return [];
};
const loadElement = async (element) => {
    if (!element.loaded) {
        element = (0, helpers_1.deepMerge)({}, globals_1.defaults.element, element);
        const hasGeotag = element.search.options && element.search.options.filter && element.search.options.filter.geotag;
        const options = formattingOptions((0, helpers_1.deepClone)(element.search.options));
        let sounds = await searchSounds(element, options);
        if (hasGeotag && sounds.length < MIN_SOUNDS) {
            globals_1.state.debug && console.log(`		geotag returned ${sounds.length} sound(s), retrying without geotag`);
            const fallbackOptions = (0, helpers_1.deepClone)(element.search.options);
            delete fallbackOptions.filter.geotag;
            const formattedFallback = formattingOptions(fallbackOptions);
            const fallbackSounds = await searchSounds(element, formattedFallback);
            sounds = sounds.concat(fallbackSounds);
        }
        element.sounds = sounds;
        element.loaded = true;
    }
    return element;
};
exports.loadElement = loadElement;
const loadPiece = async (piece) => {
    if (!piece.loaded) {
        const elementPromises = piece.elements.map((element) => loadElement(element));
        const elements = await Promise.all(elementPromises);
        piece.loaded = true;
        piece.elements = elements;
    }
    return piece;
};
exports.loadPiece = loadPiece;
//# sourceMappingURL=loadingFunctions.js.map