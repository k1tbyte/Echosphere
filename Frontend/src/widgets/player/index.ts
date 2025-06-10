import {type CSSProperties, RefObject} from 'react';

import type Plyr from "plyr";
import { type Options, type SourceInfo, type Track, type Provider } from "plyr";

// Re-export the FloatingPlayer component
export { FloatingPlayer } from './FloatingPlayer';

export type PlyrSourceInfo = {
    src: string;
    type?: string;
    provider?: string;
    size?: number;
};

export type PlyrTrack = Track;

export type PlyrProvider = Provider;

export type PlyrSource = {
    type: "video" | "audio";
    title?: string;
    poster?: string;
    sources: PlyrSourceInfo[];
    tracks?: PlyrTrack[];
};

export type PlyrProvider = Provider;

// Extend the PlyrOptions to include custom properties
export interface PlyrOptions extends Options {
    title?: string;
}

export type PlyrInstance = Plyr;

export interface IPlyrPlayerProps {
    source: PlyrSource;
    options?: PlyrOptions;
    onReady?: (player: PlyrInstance) => void;
    className?: string;
    width?: string | number;
    height?: string | number;
    aspectRatio?: "16:9" | "4:3" | "1:1" | "21:9" | string;
    containerStyle?: CSSProperties;
    fillContainer?: boolean;
    ref?: RefObject<HTMLDivElement | null>;
}

export { PlyrPlayer } from "./PlyrPlayer";