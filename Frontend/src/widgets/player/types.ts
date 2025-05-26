import { type CSSProperties } from 'react';


export type PlyrSourceInfo = {
    type: string;
    src: string;
    provider?: string;
    size?: number;
};

export type PlyrTrack = {
    kind: string;
    label: string;
    src: string;
    srclang: string;
    default?: boolean;
};

export type PlyrSource = {
    type: 'video' | 'audio';
    title?: string;
    sources: PlyrSourceInfo[];
    poster?: string;
    tracks?: PlyrTrack[];
};

export type PlyrControlNames =
    | 'play-large'
    | 'play'
    | 'progress'
    | 'current-time'
    | 'mute'
    | 'volume'
    | 'captions'
    | 'settings'
    | 'pip'
    | 'airplay'
    | 'fullscreen';

export type PlyrSettingNames =
    | 'captions'
    | 'quality'
    | 'speed'
    | 'loop';

export type PlyrMarkerPoint = {
    time: number;
    label: string;
};

export type PreviewThumbnailsOptions = {
    enabled: boolean;
    src: string | string[];
};

export type PlyrMediaMetadata = {
    title?: string;
    artist?: string;
    album?: string;
    artwork?: {
        src: string;
        sizes?: string;
        type?: string;
    }[];
};

export type PlyrListeners = {
    [key: string]: (event: CustomEvent) => void;
};

export interface PlyrOptions {
    // Core
    enabled?: boolean;
    debug?: boolean;

    controls?: PlyrControlNames[] | Function | Element;
    settings?: PlyrSettingNames[];
    loadSprite?: boolean;
    iconUrl?: string;
    iconPrefix?: string;
    blankVideo?: string;

    i18n?: {
        restart?: string;
        rewind?: string;
        play?: string;
        pause?: string;
        fastForward?: string;
        seek?: string;
        seekLabel?: string;
        played?: string;
        buffered?: string;
        currentTime?: string;
        duration?: string;
        volume?: string;
        mute?: string;
        unmute?: string;
        enableCaptions?: string;
        disableCaptions?: string;
        download?: string;
        enterFullscreen?: string;
        exitFullscreen?: string;
        frameTitle?: string;
        captions?: string;
        settings?: string;
        menuBack?: string;
        speed?: string;
        normal?: string;
        quality?: string;
        loop?: string;
        start?: string;
        end?: string;
        all?: string;
        reset?: string;
        disabled?: string;
        enabled?: string;
        advertisement?: string;
        qualityBadge?: {
            2160?: string;
            1440?: string;
            1080?: string;
            720?: string;
            576?: string;
            480?: string;
        };
        [key: string]: any;
    };

    autoplay?: boolean;
    autopause?: boolean;
    playsinline?: boolean;
    seekTime?: number;
    volume?: number;
    muted?: boolean;
    clickToPlay?: boolean;
    disableContextMenu?: boolean;
    hideControls?: boolean;
    resetOnEnd?: boolean;

    keyboard?: {
        focused?: boolean;
        global?: boolean;
    };
    tooltips?: {
        controls?: boolean;
        seek?: boolean;
    };

    duration?: number;
    displayDuration?: boolean;
    invertTime?: boolean;
    toggleInvert?: boolean;

    captions?: {
        active?: boolean;
        language?: string;
        update?: boolean;
    };

    fullscreen?: {
        enabled?: boolean;
        fallback?: boolean | 'force';
        iosNative?: boolean;
        container?: string | Element | null;
    };

    ratio?: string;

    storage?: {
        enabled?: boolean;
        key?: string;
    };

    speed?: {
        selected?: number;
        options?: number[];
    };

    quality?: {
        default?: number;
        options?: number[];
    };

    loop?: {
        active?: boolean;
    };

    ads?: {
        enabled?: boolean;
        publisherId?: string;
        tagUrl?: string;
    };

    urls?: {
        download?: string;
        vimeo?: {
            sdk?: string;
            iframe?: string;
            api?: string;
        };
        youtube?: {
            sdk?: string;
            api?: string;
        };
        [key: string]: any;
    };

    vimeo?: {
        byline?: boolean;
        portrait?: boolean;
        title?: boolean;
        speed?: boolean;
        transparent?: boolean;
        [key: string]: any;
    };

    youtube?: {
        noCookie?: boolean;
        rel?: number;
        showinfo?: number;
        iv_load_policy?: number;
        modestbranding?: number;
        [key: string]: any;
    };

    previewThumbnails?: PreviewThumbnailsOptions;

    mediaMetadata?: PlyrMediaMetadata;

    markers?: {
        enabled?: boolean;
        points?: PlyrMarkerPoint[];
    };

    listeners?: PlyrListeners;

    [key: string]: any;
}

export interface PlyrInstance {
    media: HTMLMediaElement;
    elements: {
        container: HTMLElement;
        buttons: {
            play: HTMLElement | null;
            pause: HTMLElement | null;
            restart: HTMLElement | null;
            rewind: HTMLElement | null;
            fastForward: HTMLElement | null;
            mute: HTMLElement | null;
            fullscreen: HTMLElement | null;
            pip: HTMLElement | null;
            airplay: HTMLElement | null;
            [key: string]: HTMLElement | null;
        };
        progress: HTMLElement | null;
        captions: HTMLElement | null;
        currentTime: HTMLElement | null;
        duration: HTMLElement | null;
        [key: string]: any;
    };

    play(): Promise<void> | void;
    pause(): void;
    togglePlay(toggle?: boolean): void;
    stop(): void;
    restart(): void;
    rewind(seekTime?: number): void;
    forward(seekTime?: number): void;
    increaseVolume(step?: number): void;
    decreaseVolume(step?: number): void;
    toggleCaptions(toggle?: boolean): void;

    fullscreen: {
        enter(): void;
        exit(): void;
        toggle(): void;
        enabled: boolean;
        active: boolean;
    };

    // Method for AirPlay
    airplay(): void;

    // Methods for managing thumbnail previews
    setPreviewThumbnails(source: PreviewThumbnailsOptions): void;

    // Methods for controlling controls
    toggleControls(toggle?: boolean): void;

    // Methods for event handling
    on(event: string, callback: Function): void;
    once(event: string, callback: Function): void;
    off(event: string, callback: Function): void;

    // Method for checking support
    supports(type: string): boolean;

    // Method for destroying an instance
    destroy(): void;

    // Getters and setters
    isHTML5: boolean;
    isEmbed: boolean;
    playing: boolean;
    paused: boolean;
    stopped: boolean;
    ended: boolean;
    buffered: number;
    currentTime: number;
    seeking: boolean;
    duration: number;
    volume: number;
    muted: boolean;
    hasAudio: boolean;
    speed: number;
    quality: number;
    loop: boolean;
    source: PlyrSource;
    poster: string;
    previewThumbnails: any;
    autoplay: boolean;
    currentTrack: number;
    language: string;
    pip?: boolean;
    ratio: string;
    download: string;

    [key: string]: any;
}

export interface PlyrPlayerProps {
    source: PlyrSource;
    options?: PlyrOptions;
    onReady?: (player: PlyrInstance) => void;
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    onTimeUpdate?: (event: CustomEvent) => void;
    onSeeking?: (event: CustomEvent) => void;
    onSeeked?: (event: CustomEvent) => void;
    onProgress?: (event: CustomEvent) => void;
    onRateChange?: (event: CustomEvent) => void;
    onQualityChange?: (event: CustomEvent) => void;
    onCaptionsEnabled?: (event: CustomEvent) => void;
    onCaptionsDisabled?: (event: CustomEvent) => void;
    onLanguageChange?: (event: CustomEvent) => void;
    onControlsHidden?: (event: CustomEvent) => void;
    onControlsShown?: (event: CustomEvent) => void;
    onEnterFullscreen?: (event: CustomEvent) => void;
    onExitFullscreen?: (event: CustomEvent) => void;
    onEnterpip?: (event: CustomEvent) => void;
    onLeavepip?: (event: CustomEvent) => void;
    className?: string;
    width?: string | number;
    height?: string | number;
    aspectRatio?: "16:9" | "4:3" | "1:1" | "21:9" | string;
    containerStyle?: CSSProperties;
    fillContainer?: boolean;
}