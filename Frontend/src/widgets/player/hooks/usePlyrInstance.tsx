import { useEffect, useRef, useState } from 'react';
import { PlyrInstance, PlyrPlayerProps } from '../types';
import {
    createAudioElement,
    createEmbedElement,
    createVideoElement,
    getDefaultOptions
} from '../utils';


type UsePlyrInstanceProps = {
    containerRef: React.RefObject<HTMLDivElement>;
} & Pick<
    PlyrPlayerProps,
    | 'source'
    | 'options'
    | 'aspectRatio'
    | 'className'
    | 'onReady'
    | 'onPlay'
    | 'onPause'
    | 'onEnded'
    | 'onTimeUpdate'
    | 'onSeeking'
    | 'onSeeked'
    | 'onProgress'
    | 'onRateChange'
    | 'onQualityChange'
    | 'onCaptionsEnabled'
    | 'onCaptionsDisabled'
    | 'onLanguageChange'
    | 'onControlsHidden'
    | 'onControlsShown'
    | 'onEnterFullscreen'
    | 'onExitFullscreen'
    | 'onEnterpip'
    | 'onLeavepip'
>;

export const usePlyrInstance = ({
                                    containerRef,
                                    source,
                                    options = {},
                                    aspectRatio,
                                    className,
                                    onReady,
                                    onPlay,
                                    onPause,
                                    onEnded,
                                    onTimeUpdate,
                                    onSeeking,
                                    onSeeked,
                                    onProgress,
                                    onRateChange,
                                    onQualityChange,
                                    onCaptionsEnabled,
                                    onCaptionsDisabled,
                                    onLanguageChange,
                                    onControlsHidden,
                                    onControlsShown,
                                    onEnterFullscreen,
                                    onExitFullscreen,
                                    onEnterpip,
                                    onLeavepip
                                }: UsePlyrInstanceProps) => {
    const playerRef = useRef<PlyrInstance | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const setupEventListeners = (player: PlyrInstance): void => {
        if (onReady) {
            player.on('ready', () => {
                onReady(player);

                if (player.elements?.container) {
                    const playerContainer = player.elements.container;
                    playerContainer.style.width = '100%';
                    playerContainer.style.height = '100%';
                    playerContainer.style.maxWidth = '100%';

                    const controls = playerContainer.querySelector('.plyr__controls');
                    if (controls) {
                        (controls as HTMLElement).style.position = 'relative';
                        (controls as HTMLElement).style.zIndex = '10';
                    }
                }
            });
        }

        // Main playback events
        if (onPlay) player.on('play', onPlay);
        if (onPause) player.on('pause', onPause);
        if (onEnded) player.on('ended', onEnded);

        // Time-related events
        if (onTimeUpdate) player.on('timeupdate', onTimeUpdate);
        if (onSeeking) player.on('seeking', onSeeking);
        if (onSeeked) player.on('seeked', onSeeked);
        if (onProgress) player.on('progress', onProgress);

        // Events related to settings
        if (onRateChange) player.on('ratechange', onRateChange);
        if (onQualityChange) player.on('qualitychange', onQualityChange);

        // Subtitle events
        if (onCaptionsEnabled) player.on('captionsenabled', onCaptionsEnabled);
        if (onCaptionsDisabled) player.on('captionsdisabled', onCaptionsDisabled);
        if (onLanguageChange) player.on('languagechange', onLanguageChange);

        // Events related to controls
        if (onControlsHidden) player.on('controlshidden', onControlsHidden);
        if (onControlsShown) player.on('controlsshown', onControlsShown);

        // Events related to full screen mode
        if (onEnterFullscreen) player.on('enterfullscreen', onEnterFullscreen);
        if (onExitFullscreen) player.on('exitfullscreen', onExitFullscreen);

        // Events related to PiP mode
        if (onEnterpip) player.on('enterpip', onEnterpip);
        if (onLeavepip) player.on('leavepip', onLeavepip);
    };

    useEffect(() => {
        if (!containerRef.current) return;

        let isMounted = true;

        const initPlyr = async () => {
            try {
                // Dynamic library import
                const PlyrModule = await import('plyr');
                const Plyr = PlyrModule.default;

                if (!isMounted || !containerRef.current) return;

                containerRef.current.innerHTML = '';

                const defaultOptions = getDefaultOptions(aspectRatio);
                const mergedOptions = {
                    ...defaultOptions,
                    ...options,
                    hideControls: true,
                    autoHide: true,
                    disableContextMenu: false,
                    responsive: true,
                };

                // Check if the provider is used (YouTube, Vimeo)
                const hasProvider = source.sources.length > 0 && source.sources[0].provider;

                let element;
                let wrapper;

                if (hasProvider) {
                    // For YouTube, Vimeo and other providers
                    const provider = source.sources[0].provider!;
                    const videoId = source.sources[0].src;
                    element = createEmbedElement(provider, videoId);
                    containerRef.current.appendChild(element);
                    // @ts-ignore
                    playerRef.current = new Plyr(element.querySelector('div')!, mergedOptions) as PlyrInstance;
                } else if (source.type === 'video') {
                    // For regular video

                    // Create a wrapper for correct display of aspect ratio
                    wrapper = document.createElement('div');
                    wrapper.className = 'plyr__video-wrapper';
                    wrapper.style.width = '100%';
                    wrapper.style.height = '100%';
                    wrapper.style.position = 'relative';

                    element = createVideoElement(source, className);
                    wrapper.appendChild(element);
                    containerRef.current.appendChild(wrapper);

                    // Initialize Plyr with the video element directly
                    // @ts-ignore
                    playerRef.current = new Plyr(element, mergedOptions) as PlyrInstance;
                } else {
                    // For audio - leave it as it is
                    element = createAudioElement(source, className);
                    containerRef.current.appendChild(element);
                    // @ts-ignore
                    playerRef.current = new Plyr(element, mergedOptions) as PlyrInstance;
                }

                // Configuring event handlers
                if (playerRef.current) {
                    setupEventListeners(playerRef.current);
                    setIsLoaded(true);
                    console.log('Plyr initialized successfully');
                }
            } catch (error) {
                console.error('Error initializing Plyr:', error);
            }
        };

        initPlyr();

        // Cleanup on unmounting
        return () => {
            isMounted = false;
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [source, options, aspectRatio, className]);

    return { player: playerRef.current, isLoaded };
};