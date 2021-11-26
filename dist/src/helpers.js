"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sec2ms = exports.ms2sec = exports.deepClone = exports.loadBuffer = exports.deepMerge = exports.NoRepetition = exports.asyncPipe = exports.safeChain = void 0;
const asyncPipe = (...fns) => (arg) => fns.reduce((p, f) => p.then(f), Promise.resolve(arg));
exports.asyncPipe = asyncPipe;
const NoRepetition = class {
    constructor(max, waiting, reuse) {
        const fillRange = (start, end) => Array(end - start + 1).fill(0).map((item, index) => start + index);
        this.waiting = waiting;
        this.reuse = reuse;
        this.possible = fillRange(0, max - 1);
        this.discarded = [];
    }
    next() {
        if (this.discarded.length > this.waiting || this.possible.length == 0) {
            this.possible = this.possible.concat(this.discarded.slice(0, this.reuse));
            this.discarded.splice(0, this.reuse);
        }
        const index = Math.floor(Math.random() * this.possible.length);
        const result = this.possible[index];
        this.possible.splice(index, 1);
        this.discarded.push(result);
        return result;
    }
};
exports.NoRepetition = NoRepetition;
const deepMerge = (target, ...sources) => {
    const isObject = (item) => (item && typeof item === 'object' && !Array.isArray(item));
    if (!sources.length)
        return target;
    const source = sources.shift();
    if (isObject(target) && isObject(source)) {
        for (let key in source) {
            if (isObject(source[key])) {
                if (!target[key])
                    Object.assign(target, { [key]: {} });
                deepMerge(target[key], source[key]);
            }
            else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }
    return deepMerge(target, ...sources);
};
exports.deepMerge = deepMerge;
const loadBuffer = async (url, context) => await fetch(url)
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => context.decodeAudioData(arrayBuffer));
exports.loadBuffer = loadBuffer;
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
exports.deepClone = deepClone;
const ms2sec = (t) => t / 1000;
exports.ms2sec = ms2sec;
const sec2ms = (t) => t * 1000;
exports.sec2ms = sec2ms;
const safeChain = (string, obj) => string.split('.').reduce((res, el) => res = res && res[el], obj);
exports.safeChain = safeChain;
//# sourceMappingURL=helpers.js.map