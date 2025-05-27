import { useEffect, useRef, useState } from 'react';
import { PlyrInstance, IPlyrPlayerProps } from '../index';
import {
    createAudioElement,
    createEmbedElement,
    createVideoElement,
    getDefaultOptions
} from '../utils';


type UsePlyrInstanceProps = {
    containerRef: React.RefObject<HTMLDivElement>;
} & Pick<
    IPlyrPlayerProps,
    | 'source'
    | 'options'
    | 'aspectRatio'
    | 'className'
    | 'onReady'
>;

export const usePlyrInstance = ({
                                    containerRef,
                                    source,
                                    options = {},
                                    aspectRatio,
                                    className,
                                    onReady
                                }: UsePlyrInstanceProps) => {
    const playerRef = useRef<PlyrInstance | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const wasInitializedRef = useRef(false);

    useEffect(() => {
        if (!containerRef.current) return;

        if (wasInitializedRef.current && playerRef.current) {
            try {
                if (source && playerRef.current) {
                    const hasProvider = source.sources.length > 0 && source.sources[0].provider;

                    if (hasProvider) {
                        playerRef.current.source = {
                            type: source.type,
                            sources: source.sources
                        };
                    } else {
                        const videoElement = containerRef.current.querySelector('video');
                        if (videoElement && source.sources && source.sources.length > 0) {
                            videoElement.src = source.sources[0].src;
                        }
                    }
                }
            } catch (err) {
                console.error("Error updating player source:", err);
            }
            return;
        }

        let isMounted = true;

        const initPlyr = async () => {
            if (wasInitializedRef.current) return;

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

                if (playerRef.current) {
                    wasInitializedRef.current = true;

                    if (onReady) {
                        onReady(playerRef.current);
                    }
                    setIsLoaded(true);
                }
            } catch (error) {
                console.error('Error initializing Plyr:', error);
            }
        };

        initPlyr();

        return () => {
            isMounted = false;
            if (!wasInitializedRef.current) return;

            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
                wasInitializedRef.current = false;
            }
        };
    }, []);

    useEffect(() => {
        if (!wasInitializedRef.current || !playerRef.current) return;

        try {
            if (source && playerRef.current) {
                const hasProvider = source.sources.length > 0 && source.sources[0].provider;

                if (hasProvider) {
                    playerRef.current.source = {
                        type: source.type,
                        sources: source.sources
                    };
                } else {
                    // Для обычных видео
                    const videoElement = containerRef.current?.querySelector('video');
                    if (videoElement && source.sources && source.sources.length > 0) {
                        videoElement.src = source.sources[0].src;
                        playerRef.current.restart();
                    }
                }
            }
        } catch (err) {
            console.error("Error updating player source:", err);
        }
    }, [source]);

    return { player: playerRef.current, isLoaded };
};