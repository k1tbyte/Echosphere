import {type CSSProperties, RefObject} from 'react';

import type Plyr from "plyr";
import { type Options, type SourceInfo, type Track } from "plyr";


export type PlyrSourceInfo = {
    type: string;
    src: string;
    provider?: string;
    size?: number;
};

export type PlyrTrack = Track;

export type PlyrSource = SourceInfo;

export type PlyrProvider = Plyr.Provider;

export type PlyrOptions = Options;

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