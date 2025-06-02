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

const isHlsSource = (source: any): boolean => {
    if (!source?.sources?.length) return false;
    return source.sources.some((src: any) =>
        src.src && src.src.includes('.m3u8')
    );
};

const getHlsUrl = (source: any): string => {
    if (!source?.sources?.length) return '';
    const hlsSource = source.sources.find((src: any) =>
        src.src && src.src.includes('.m3u8')
    );
    return hlsSource?.src || '';
};

export const usePlyrInstance = ({
                                    containerRef,
                                    source,
                                    options = {},
                                    aspectRatio,
                                    className,
                                    onReady
                                }: UsePlyrInstanceProps) => {
    const playerRef = useRef<PlyrInstance | null>(null);
    const hlsRef = useRef<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const wasInitializedRef = useRef(false);
    const hasQualityRef = useRef(false);

    const setupDynamicMenuHeight = () => {
        const container = containerRef.current;
        if (!container) return;

        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    let target = mutation.target as HTMLElement;

                    // Проверяем появление меню
                    if (target && target.classList.contains('plyr__controls')) {
                        const plyrContainer = container.querySelector('.plyr');
                        const controlsElement = container.querySelector('.plyr__controls');
                        target = container.querySelector('.plyr__menu__container') as HTMLElement;

                        if (plyrContainer && controlsElement) {
                            const plyrRect = plyrContainer.getBoundingClientRect();
                            const controlsRect = controlsElement.getBoundingClientRect();

                            const availableHeight = controlsRect.top - plyrRect.top;
                            const maxMenuHeight = Math.max(100, availableHeight - 10);

                            setTimeout(() => {
                                if(!target?.scrollHeight) {
                                    return;
                                }
                                const menuHeight = target.scrollHeight;
                                if (menuHeight <= maxMenuHeight) {
                                    // Места хватает - скрываем скролл
                                    target.style.overflowY = 'hidden';
                                    target.style.maxHeight = 'none';
                                } else {
                                    // Места не хватает - показываем скролл
                                    target.style.overflowY = 'auto';
                                    target.style.maxHeight = `${maxMenuHeight}px`;
                                }

                                target.style.overflowX = 'hidden';
                            }, 200);
                        }
                    }
                }
            });
        });

        // Наблюдаем за всем контейнером плеера
        mutationObserver.observe(container, {
            attributes: true,
            subtree: true,
            attributeFilter: ['class']
        });

        return mutationObserver;
    };

    useEffect(() => {
        if (!containerRef.current) return;

        let isMounted = true;

        const initPlyr = async () => {
            if (wasInitializedRef.current && !isHlsSource(source)) return;

            try {
                // Clearing previous instances
                if (playerRef.current) {
                    playerRef.current.destroy();
                    playerRef.current = null;
                }
                if (hlsRef.current) {
                    hlsRef.current.destroy();
                    hlsRef.current = null;
                }
                hasQualityRef.current = false;

                // Dynamic library imports
                const [PlyrModule, HlsModule] = await Promise.all([
                    import('plyr'),
                    import('hls.js')
                ]);

                const Plyr = PlyrModule.default;
                const Hls = HlsModule.default;

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

                let element: HTMLElement;
                let wrapper;

                if (hasProvider) {
                    // For YouTube, Vimeo and other providers
                    const provider = source.sources[0].provider!;
                    const videoId = source.sources[0].src;
                    element = createEmbedElement(provider, videoId);
                    containerRef.current.appendChild(element);
                    // @ts-ignore
                    playerRef.current = new Plyr(element.querySelector('div')!, mergedOptions) as PlyrInstance;

                    wasInitializedRef.current = true;
                    if (onReady) {
                        onReady(playerRef.current);
                    }
                    setIsLoaded(true);

                } else if (source.type === 'video') {
                    // Create a wrapper for correct display of aspect ratio
                    wrapper = document.createElement('div');
                    wrapper.className = 'plyr__video-wrapper';
                    wrapper.style.width = '100%';
                    wrapper.style.height = '100%';
                    wrapper.style.position = 'relative';

                    element = createVideoElement(source, className);
                    element.style.visibility = 'hidden';
                    wrapper.appendChild(element);
                    containerRef.current.appendChild(wrapper);

                    // Check HLS
                    if (isHlsSource(source) && Hls.isSupported()) {
                        const hlsUrl = getHlsUrl(source);

                        const hls = new Hls({
                            enableWorker: true,
                            lowLatencyMode: true,
                        });

                        hlsRef.current = hls;
                        hls.loadSource(hlsUrl);
                        hls.attachMedia(element as HTMLMediaElement);

                        // Level switching processing
                        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                            if (playerRef.current && hls.levels[data.level]) {
                                playerRef.current.quality = hls.levels[data.level].height;
                            }
                        });

                        // Processing of quality levels
                        hls.on(Hls.Events.MANIFEST_PARSED, () => {
                            if (hasQualityRef.current) return;

                            const levels = hls.levels;

                            const quality = {
                                default: levels[levels.length - 1]?.height || 'auto',
                                options: levels.map((level: any) => level.height).sort((a: number, b: number) => b - a),
                                forced: true,
                                onChange: (newQuality: number) => {
                                    levels.forEach((level: any, levelIndex: number) => {
                                        if (level.height === newQuality) {
                                            hls.nextLevel = levelIndex;
                                        }
                                    });
                                },
                            };

                            // Переинициализируем Plyr с качествами
                            if (playerRef.current) {
                                playerRef.current.destroy();
                            }

                            const plyrOptionsWithQuality = {
                                ...mergedOptions,
                                quality
                            };

                            // @ts-ignore
                            playerRef.current = new Plyr(element, plyrOptionsWithQuality) as PlyrInstance;
                            element.style.visibility = 'visible';
                            hasQualityRef.current = true;
                            wasInitializedRef.current = true;

                            // Call onReady only after adding qualities
                            if (onReady) {
                                onReady(playerRef.current);
                            }
                            setIsLoaded(true);
                        });

                        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
                            console.error('HLS error:', data);
                            if (data.fatal) {
                                switch (data.type) {
                                    case Hls.ErrorTypes.NETWORK_ERROR:
                                        hls.startLoad();
                                        break;
                                    case Hls.ErrorTypes.MEDIA_ERROR:
                                        hls.recoverMediaError();
                                        break;
                                    default:
                                        hls.destroy();
                                        break;
                                }
                            }
                        });

                    } else {
                        // Normal video or native HLS (Safari)
                        // @ts-ignore
                        playerRef.current = new Plyr(element, mergedOptions) as PlyrInstance;
                        element.style.visibility = 'visible';

                        wasInitializedRef.current = true;
                        if (onReady) {
                            onReady(playerRef.current);
                        }
                        setIsLoaded(true);
                    }

                } else {
                    // For audio - leave it as it is
                    element = createAudioElement(source, className);
                    containerRef.current.appendChild(element);
                    // @ts-ignore
                    playerRef.current = new Plyr(element, mergedOptions) as PlyrInstance;

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


        if (wasInitializedRef.current && playerRef.current) {
            try {
                if (source && playerRef.current) {
                    const hasProvider = source.sources.length > 0 && source.sources[0].provider;

                    if (hasProvider) {
                        playerRef.current.source = {
                            type: source.type,
                            sources: source.sources
                        };
                    } else if (isHlsSource(source)) {
                        // For HLS - reinitialize completely
                        initPlyr();
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

        initPlyr();
        const menuResizeObserver = setupDynamicMenuHeight();

        return () => {
            isMounted = false;
            if (menuResizeObserver) {
                menuResizeObserver.disconnect();
            }
            if (!wasInitializedRef.current) return;

            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            wasInitializedRef.current = false;
            hasQualityRef.current = false;
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
                } else if (isHlsSource(source)) {
                    // For HLS sources, reinitialize completely
                    wasInitializedRef.current = false;
                    hasQualityRef.current = false;
                    // Trigger reinitialization through the first useEffect
                } else {
                    // For regular videos
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