"use client";

import React, { useRef, useEffect, useState } from 'react';
import {redirect, useRouter} from 'next/navigation';
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Loader";
import {useNavigationStore} from "@/store/navigationStore";
import {PlyrPlayer, PlyrSource} from "@/widgets/player";
import {captureVideoFrame, type ParsedVideo, parseVideoUrl} from "@/pages/Home/utils/videoParser";
import {Input} from "@/shared/ui/Input";
import {Label} from "@/shared/ui/Label";

interface IUrlInputProps {
    onSuccess: (video: ParsedVideo) => void;
}

const UrlInput: React.FC<IUrlInputProps> = ({ onSuccess }) => {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const parsedVideo = await parseVideoUrl(url);

            if (!parsedVideo) {
                setError('Failed to recognize the video link. YouTube and Vimeo are currently supported');
                return;
            }

            onSuccess({
                id: parsedVideo.id,
                provider: parsedVideo.provider,
                thumbnailUrl: parsedVideo.thumbnailUrl,
                title: parsedVideo.title
            });
        } catch (error) {
            setError('An error occurred while processing a link');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Insert a link to YouTube or Vimeo"
                disabled={isLoading}
            />

            {error && <div className="text-destructive text-sm">{error}</div>}

            <Button type="submit" disabled={isLoading || !url.trim()} loading={isLoading}>
                Load the video
            </Button>
        </form>
    );
};

export const StudioPage = () => {
    const { data } = useNavigationStore();
    const [screenSize, setScreenSize] = useState<'mobile' | 'desktop'>('desktop');
    const [videoProps, setVideoProps ] = useState(data);
    const [video, setVideo] = useState<PlyrSource | null>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (!videoProps) {
            return;
        }

        // If there is a file - work with local video
        if (videoProps.file) {
            const url = URL.createObjectURL(videoProps.file);
            setVideo({
                type: 'video',
                sources: [{ src: url, type: videoProps.file.type }]
            });

            return () => URL.revokeObjectURL(url);
        }

        // If there is an id and provider - work with external video
        if (videoProps.id && videoProps.provider) {
            setVideo({
                type: 'video',
                sources: [{
                    src: videoProps.id,
                    provider: videoProps.provider,
                    type: 'video/mp4'
                }]
            });

            if (videoProps.thumbnailUrl) {
                setThumbnailUrl(videoProps.thumbnailUrl);
            }
        } else {
            redirect('/home');
        }
    }, [videoProps]);

    const handleCaptureFrame = async () => {
        if (!playerContainerRef.current) return;
        setIsCapturing(true);

        try {
            const videoElement = playerContainerRef.current.querySelector('video');
            if (!videoElement) throw new Error('Video element not found');

            const blob = await captureVideoFrame(videoElement);

            // Clearing the previous URL
            if (thumbnailUrl && !videoProps?.thumbnailUrl) {
                URL.revokeObjectURL(thumbnailUrl);
            }

            // Creating a new URL
            const newThumbnailUrl = URL.createObjectURL(blob);
            setThumbnailUrl(newThumbnailUrl);
        } catch (error) {
            console.error('Error capturing frame:', error);
        } finally {
            setIsCapturing(false);
        }
    };

    useEffect(() => {
        return () => {
            if (thumbnailUrl && !videoProps?.thumbnailUrl) {
                URL.revokeObjectURL(thumbnailUrl);
            }
        };
    }, [thumbnailUrl]);

    useEffect(() => {
        if (!isInitialized || !containerRef.current) {
            return;
        }

        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                setScreenSize(width < 768 ? 'mobile' : 'desktop');
            }
        });

        observer.observe(containerRef.current);
        return () => {
            observer.disconnect();
        }
    }, [isInitialized]);

    if(!videoProps) {
        return <UrlInput onSuccess={(o) => {
            setVideoProps(o);
        }} />
    }

    if (!video) {
        return (
            <div className="w-full h-full flex-center">
                <Spinner size={66}/>
            </div>
        );
    }

    const isLocalVideo = !!videoProps?.file;

    return (
        <div ref={containerRef} className="w-full h-full relative">
            <div className={`w-full ${screenSize === 'desktop' ? 'grid grid-cols-12 gap-6' : 'flex flex-col gap-4'}`}>
                <div className={`${screenSize === 'desktop' ? 'col-span-7' : 'w-full'} order-1`}>
                    <PlyrPlayer
                        onReady={() => setIsInitialized(true)}
                        ref={playerContainerRef}
                        source={video}
                        options={{ controls: ['play', 'progress', 'playlarge', ] }}
                        height={"auto"}
                        containerStyle={{
                            border: '1px solid #333',
                            borderRadius: '8px'
                        }}
                        aspectRatio="16:9"
                    />
                </div>

                <div className={`${screenSize === 'desktop' ? 'col-span-5' : 'w-full'} order-2`}>
                    <Label size={"lg"} htmlFor="title">Video title</Label>
                    <Input
                        className="mt-2"
                        name="title"
                        placeholder="Some video title for this video"
                        required
                    />

                    {thumbnailUrl && (
                        <div className="w-full my-4">
                            <h3 className="text-lg font-medium mb-2">Preview thumbnail:</h3>
                            {!isLocalVideo && (
                                <p className="text-sm text-muted-foreground mb-2">
                                    A standard miniature from external provider
                                </p>
                            )}
                            <div className="border border-border rounded-md p-2 bg-card/20">
                                <img
                                    src={thumbnailUrl}
                                    alt="Video thumbnail"
                                    className="w-full h-auto rounded"
                                />
                            </div>
                        </div>
                    )}

                    {isLocalVideo && (
                        <Button
                            onClick={handleCaptureFrame}
                            disabled={isCapturing}
                            className="w-full mt-4"
                        >
                            {isCapturing ? 'Capturing...' : 'Take a snapshot of the current frame'}
                        </Button>
                    )}
                </div>
            </div>
            <Button variant={"outline"} className="absolute bottom-0 w-full">
                Upload video
            </Button>
        </div>
    );
};