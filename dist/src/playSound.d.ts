export default class _default {
    constructor(sound: any, elementGainNode: any, options?: {});
    fadeDuration: number | undefined;
    gain: any;
    onstarted: () => void;
    onended: () => void;
    source: any;
    fade: {
        fadeIn(timestamp?: number): void;
        fadeOut(timestamp?: number): void;
        fadeTo(timestamp: any, from: any, to: any): void;
    };
    active: boolean;
    play(): Promise<any>;
    load(): Promise<any>;
    stop(): void;
}
