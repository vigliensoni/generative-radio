export default class _default {
    constructor(element: any, pieceGainNode: any, options?: {});
    onstarted: () => void;
    started: boolean;
    playing: boolean;
    _makePlayer(index: any, mono: any, metro: any): playSound | null;
    play(): Promise<any>;
    player: playSound | null | undefined;
    nextPlayer: playSound | null | undefined;
    newPlayerLoad: Promise<any> | undefined;
    metro: NodeJS.Timeout | undefined;
    load(): Promise<any>;
    element: any;
    stop(): void;
    cut(): void;
}
import playSound from "./playSound";
