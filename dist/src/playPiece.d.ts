export default class _default {
    constructor(piece: any);
    gain: any;
    playing: boolean;
    piece: any;
    elementPlayers: any[];
    onended: () => void;
    fade: {
        fadeIn(timestamp?: number): void;
        fadeOut(timestamp?: number): void;
        fadeTo(timestamp: any, from: any, to: any): void;
    };
    play(): Promise<void>;
    stop(timestamp: any): Promise<void>;
    cut(): void;
}
