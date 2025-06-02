"use client";

import React, {  useRef, useEffect, useState } from 'react';
import {redirect, useRouter} from 'next/navigation';
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Loader";
import {useNavigationStore} from "@/store/navigationStore";
import {captureVideoFrame, parseVideoUrl} from "@/pages/Home/utils/videoParser";
import {Input} from "@/shared/ui/Input";
import {Label} from "@/shared/ui/Label";
import {Separator} from "@/shared/ui/Separator";
import {Badge} from "@/shared/ui/Badge";
import {formatDurationExtended, formatFileSize} from "@/shared/lib/formatters";
import {VideoDropZone} from "@/pages/Home/ui/VideoDropZone";
import {VideoUploadService} from "@/shared/services/videoUploadService";
import {resumeVideoUpload} from "@/pages/Home/ui/ResumeVideoUploadModal";
import {useNotificationsStore} from "@/store/notificationsStore";
import {useVideosStore} from "@/store/videoStore";
import {VideoSettingsSection} from "@/pages/Home/ui/VideoSettingsSection";
import {PlyrSource, PlyrPlayer} from "@/widgets/player";

export type TypeQuality = { value: string; label: string }[];
const QUALITIES = [
    { value: "4320", label: '4320p (8K)' },
    { value: "2160", label: '2160p (4K)' },
    { value: "1440", label: '1440p (2K)' },
    { value: "1080", label: '1080p (Full HD)' },
    { value: "720", label: '720p (HD)' },
    { value: "480", label: '480p (SD)' },
    { value: "360", label: '360p' },
    { value: "240", label: '240p' },
    { value: "144", label: '144p' }
];

const THUMBNAIL_RANGES = ["Off ","0.5s", "1s  ", "2s  ", "3s  ", "5s  ", "10s"];

const PROVIDERS = [ 'youtube', 'vimeo' ];

interface IUrlInputProps {
    onSuccess: (video: any) => void;
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
                previewUrl: parsedVideo.thumbnailUrl,
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
        <form onSubmit={handleSubmit} className="flex h-full flex-col gap-3 p-4">
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
            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                    <span className="relative z-10 bg-background px-2 text-muted-foreground">
                        Or
                    </span>
            </div>
            {    /*@ts-ignore}  */ }
            <VideoDropZone className="h-full" successcallback={(f) => {
                onSuccess({file: f});
            }}/>
        </form>
    );
};

export const StudioPage = () => {
    const { data } = useNavigationStore();
    const router = useRouter();
    const [screenSize, setScreenSize] = useState<'mobile' | 'desktop'>('desktop');
    const [videoProps, setVideoProps ] = useState(data);
    const [video, setVideo] = useState<PlyrSource | null>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const fingerprint = useRef<string | null>(null);
    const containerRef = useRef<HTMLFormElement>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [availableQualities, setAvailableQualities] = useState<TypeQuality>([]);
    const store = useVideosStore();
    const notificationsStore = useNotificationsStore();
    const isLocalVideo = !!videoProps?.file;
    const schema = store.schema;

    useEffect(() => {
        if (!videoProps) {
            return;
        }

        // If there is a file - work with local video
        if (videoProps.file) {
            videoProps.settings = {};
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
            videoProps.previewBlob = blob;
            setThumbnailUrl(newThumbnailUrl);
        } catch (error) {
            console.error('Error capturing frame:', error);
        } finally {
            setIsCapturing(false);
        }
    };

    const handleOnReady = () => {
        if(!isLocalVideo) {
            setIsInitialized(true);
        }

        
        console.log("cocktainer",playerContainerRef.current)

        const handleMetadata = (e: any) => {
            const video = e.target as HTMLVideoElement;
            video.removeEventListener('loadedmetadata', handleMetadata);
            videoProps.width = video.videoWidth;
            videoProps.height = video.videoHeight;
            videoProps.duration = video.duration;
            setAvailableQualities(QUALITIES.filter(q => {
                const quality = parseInt(q.value, 10);
                return videoProps.height >= quality;
            }));
            setVideoProps({...videoProps});
            setIsInitialized(true)
        }

        const videoElement = playerContainerRef.current?.querySelector('video');
        videoElement?.addEventListener('loadedmetadata', handleMetadata);
    }

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

    useEffect(() => {
        if(store.schema !== undefined) {
            return;
        }

        store.schema = null;
        VideoUploadService.getVideoSettingsSchema().then((o) => {
            console.log(o);
            store.setSchema(o);
        }).catch(() => store.schema = undefined)
    }, [])

    if(!videoProps) {
        return <UrlInput onSuccess={(o) => {
            setVideoProps(o);
        }} />
    }

    if (!video || !schema) {
        return (
            <div className="w-full h-full flex-center">
                <Spinner size={66}/>
            </div>
        );
    }

    return (
        <form ref={containerRef} className="w-full justify-between h-full flex flex-col px-4 pt-4" onSubmit={ async (e) => {
            e.preventDefault();

            if(!isLocalVideo) {
                await VideoUploadService.startNewUpload({
                    title: videoProps.title,
                    id: videoProps.id,
                    provider: PROVIDERS.indexOf(videoProps.provider) + 1,
                    previewUrl: videoProps.previewUrl
                });
                return;
            }

            const id = await VideoUploadService.startNewUploadFile(videoProps.file,{
                    title: videoProps.title,
                    duration: videoProps.duration,
                    thumbnailsCaptureInterval: videoProps.thumbnailsCaptureInterval,
                    settings: videoProps.settings,
                }, videoProps.file.fingerprint, videoProps.previewBlob
            );
            resumeVideoUpload({ title: videoProps.title, id, uploadedSize: 0 },
                videoProps.file,
                notificationsStore);
            router.push('/home');
        }}>
            <div className={`w-full ${screenSize === 'desktop' ? 'grid grid-cols-12 gap-6' : 'flex flex-col gap-4'}`}>
                <div className={`${screenSize === 'desktop' ? 'col-span-7' : 'w-full'} order-1`}>
                    <PlyrPlayer
                        onReady={handleOnReady}
                        ref={playerContainerRef}
                        source={video}
                        options={{ controls: ['play', 'progress', 'playlarge' ] }}
                    />

                    { isLocalVideo &&
                        <div className="mt-4 bg-secondary/30 rounded-sm p-4 flex flex-wrap  gap-5">
                            <div className="flex gap-3">
                                <Label>
                                    Quality:
                                </Label>
                                <Badge>
                                    {videoProps.width}x{videoProps.height}
                                </Badge>
                            </div>

                            <div className="flex gap-3">
                                <Label>Duration:</Label>
                                <Badge>{videoProps.duration ?
                                    formatDurationExtended(videoProps.duration, { format: 'full', showZero: false }) :
                                    'Unknown'}
                                </Badge>
                            </div>

                            <div className="flex gap-3">
                                <Label>Size:</Label>
                                <Badge>{videoProps.duration ?
                                    formatFileSize(videoProps.file?.size || 0) :
                                    'Unknown'}
                                </Badge>
                            </div>
                        </div>
                    }
                </div>

                <div className={`${screenSize === 'desktop' ? 'col-span-5' : 'w-full'} order-2`}>
                    <Label size={"lg"} htmlFor="title">Video title</Label>
                    <Input onInput={(e) => videoProps.title = e.currentTarget.value}
                        className="mt-2"
                        name="title"
                        placeholder="Some video title for this video"
                        required
                    />

                    <Separator className="my-5"/>
                    {isLocalVideo &&
                        <>
                            <VideoSettingsSection settings={videoProps.settings} schema={schema} videoQualities={availableQualities}/>
                            <Separator className="my-5"/>
                        </>
                    }

                    <Label size={"lg"}>Preview thumbnail</Label>
                    {thumbnailUrl && (
                        <div className="w-full mb-4">
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
                            {isCapturing ? 'Capturing...' : 'Use current frame as a video preview'}
                        </Button>
                    )}
                </div>
            </div>
            <div className="w-full">
                <Separator className="my-5"/>
                <Button type="submit" variant={"outline"} className="w-full mb-5">
                    Upload video
                </Button>
            </div>

        </form>
    );
};