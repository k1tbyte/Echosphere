import { PlyrSourceInfo, PlyrTrack, PlyrOptions } from './types';

export const getAspectRatio = (aspectRatio: string): number => {
    if (!aspectRatio) return 56.25; // 16:9 по умолчанию (56.25%)

    const [w, h] = aspectRatio.split(':').map(Number);
    if (!w || !h) return 56.25;

    return (h / w) * 100;
};

/**
 * Creates an HTML source element for video/audio
 */
export const createSourceElement = (src: PlyrSourceInfo): HTMLSourceElement => {
    const sourceElement = document.createElement('source');
    sourceElement.src = src.src;
    sourceElement.type = src.type;

    // Используем setAttribute для нестандартных атрибутов
    if (src.size) {
        sourceElement.setAttribute('size', src.size.toString());
    }

    return sourceElement;
};

/**
 * Creates an HTML track element for video/audio
 */
export const createTrackElement = (track: PlyrTrack): HTMLTrackElement => {
    const trackElement = document.createElement('track');
    trackElement.kind = track.kind;
    trackElement.label = track.label;
    trackElement.src = track.src;
    trackElement.srclang = track.srclang;
    if (track.default) trackElement.default = track.default;
    return trackElement;
};

/**
 * Creates an HTML element for the video
 */
export const createVideoElement = (
    source: any,
    className?: string
): HTMLVideoElement => {
    const videoElement = document.createElement('video') as HTMLVideoElement;
    videoElement.className = className || '';
    videoElement.controls = true;
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.playsInline = true;

    if (source.poster) {
        videoElement.poster = source.poster;
    }

    // Add sources
    source.sources.forEach((src: PlyrSourceInfo) => {
        const sourceElement = createSourceElement(src);
        videoElement.appendChild(sourceElement);
    });

    // Add tracks
    if (source.tracks) {
        source.tracks.forEach((track: PlyrTrack) => {
            const trackElement = createTrackElement(track);
            videoElement.appendChild(trackElement);
        });
    }

    return videoElement;
};

export const createAudioElement = (
    source: any,
    className?: string
): HTMLAudioElement => {
    const audioElement = document.createElement('audio') as HTMLAudioElement;
    audioElement.className = className || '';
    audioElement.controls = true;
    audioElement.style.width = '100%';

    // Add sources
    source.sources.forEach((src: PlyrSourceInfo) => {
        const sourceElement = createSourceElement(src);
        audioElement.appendChild(sourceElement);
    });

    return audioElement;
};

/**
 * Creates HTML element for embedded video (YouTube, Vimeo)
 */
export const createEmbedElement = (
    provider: string,
    videoId: string
): HTMLDivElement => {
    // Create a wrapper for the correct aspect ratio
    const wrapper = document.createElement('div');
    wrapper.className = 'plyr__video-embed';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.position = 'relative';
    wrapper.style.overflow = 'hidden';
    wrapper.style.borderRadius = 'inherit';

    // Internal div for the provider
    const providerDiv = document.createElement('div');
    providerDiv.setAttribute('data-plyr-provider', provider);
    providerDiv.setAttribute('data-plyr-embed-id', videoId);
    providerDiv.style.position = 'absolute';
    providerDiv.style.top = '0';
    providerDiv.style.left = '0';
    providerDiv.style.width = '100%';
    providerDiv.style.height = '100%';

    wrapper.appendChild(providerDiv);
    return wrapper;
};


export const getDefaultOptions = (aspectRatio?: string): PlyrOptions => ({
    controls: [
        'play-large', 'play', 'progress', 'current-time', 'mute',
        'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
    ],
    loadSprite: true,
    responsive: true,
    ratio: aspectRatio,
    iconUrl: 'https://cdn.plyr.io/3.7.8/plyr.svg',
    blankVideo: 'https://cdn.plyr.io/static/blank.mp4',
    youtube: {
        noCookie: true,
        rel: 0,
        showinfo: 0,
        playsinline: 1,
    },
    vimeo: {
        byline: false,
        portrait: false,
        title: false
    }
});