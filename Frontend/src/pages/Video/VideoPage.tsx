"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { IVideoObject, VideosService, EVideoProvider } from "@/shared/services/videosService";
import { PlyrPlayer, PlyrOptions } from "@/widgets/player";
import { Spinner } from "@/shared/ui/Loader";
import { Badge } from "@/shared/ui/Badge";
import { Label } from "@/shared/ui/Label";
import {
    formatDuration,
    formatDurationExtended,
    formatFileSize,
    formatTimeAgoPrecise,
    getVideoQuality
} from "@/shared/lib/formatters";
import Image from "next/image";
import { UsersService } from "@/shared/services/usersService";
import { openUserProfileModal } from "@/widgets/modals/UserProfileModal";
import { EIcon, SvgIcon } from "@/shared/ui/Icon";
import { Separator } from "@/shared/ui/Separator";
import { ThumbsUp, Eye, Trash2, MinimizeIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { EUserRole } from "@/types/user-role";
import { useBreadcrumbs } from "@/store/uiMetaStore";
import { openConfirmationModal } from "@/widgets/modals/ConfirmationModal";
import { toast, ToastVariant } from "@/shared/ui/Toast";
import { Button } from "@/shared/ui/Button";
import { useVideoPlayerStore } from "@/store/videoPlayerStore";

const providers = [
    "local",
    "youtube",
    "vimeo"
] as const;

// Define type for PlyrSource including title property
// This can be removed since we've updated the types in index.ts
/*interface EnhancedPlyrOptions extends Omit<import('plyr').Options, 'title'> {
    title?: string;
}*/

export const VideoPage = () => {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const { setBreadcrumbs } = useBreadcrumbs();
    const [video, setVideo] = useState<IVideoObject>();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>();

    // Get player state from store
    const { 
        videoId: storedVideoId, 
        source: storedSource, 
        currentTime, 
        setVideoData, 
        setFloating, 
        setPlayerInstance,
        syncPlayerState
    } = useVideoPlayerStore();

    useEffect(() => {
        const loadVideo = async () => {
            if (!params?.id) return;

            try {
                const videoData = await VideosService.getVideoById(params.id as string, true);
                setVideo(videoData);
                
                // Update breadcrumbs to only show video title
                setBreadcrumbs([{
                    href: window.location.pathname,
                    label: videoData.title,
                    active: true
                }]);
            } catch (error: any) {
                console.error('Failed to load video:', error);
                if (error.status === 404) {
                    setError("Video not found");
                } else if (error.status === 403) {
                    setError("You don't have permission to view this video");
                } else {
                    setError("Failed to load video");
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadVideo();

        // Clear breadcrumbs on unmount
        return () => {
            setBreadcrumbs([]);
        };
    }, [params?.id, setBreadcrumbs]);

    // Clear breadcrumbs when navigating away
    useEffect(() => {
        return () => {
            setBreadcrumbs([]);
        };
    }, [setBreadcrumbs]);

    const canDelete = session && (
        session.user.role === EUserRole.Admin || 
        (video && video.ownerId === Number(session.user.id))
    );

    const handleDelete = () => {
        if (!video) return;

        openConfirmationModal({
            body: `Are you sure you want to delete the video "${video.title}"?`,
            destructiveYes: true,
            onYes: async () => {
                try {
                    await VideosService.deleteVideo(video.id);
                    router.push('/');
                } catch (error) {
                    toast.open({
                        variant: ToastVariant.Error,
                        body: 'Failed to delete video'
                    });
                }
            }
        });
    };

    // Handle player ready
    const handlePlayerReady = (player: any) => {
        setPlayerInstance(player);
        
        // If we have a stored time position, set it
        if (storedVideoId === params?.id && currentTime > 0) {
            player.currentTime = currentTime;
        }
    };

    // Handle minimize button click to enter floating mode
    const handleMinimize = () => {
        if (!video) return;
        
        // Save current player state before minimizing
        syncPlayerState();
        
        // Activate floating mode with current video
        setFloating(true);
        
        // Navigate back to home or previous page
        router.back();
    };

    // Update video data in store whenever the video changes
    useEffect(() => {
        if (!video) return;
        
        const videoSource = {
            type: "video" as const,
            sources: [video.provider === EVideoProvider.Local ? {
                src: `${process.env.NEXT_PUBLIC_API_URL}/video/resource/${video.id}/master.m3u8`,
                type: "application/x-mpegURL",
            } : {
                src: video.videoUrl!, // id actually
                provider: providers[video.provider]
            }]
        };
        
        setVideoData(video.id, videoSource, { title: video.title });
    }, [video, setVideoData]);

    if (isLoading) {
        return (
            <div className="flex-center py-8">
                <Spinner />
            </div>
        );
    }

    if (error || !video) {
        return (
            <div className="container py-6 max-w-7xl mx-auto">
                <div className="flex flex-col items-center justify-center py-12">
                    <h2 className="text-2xl font-semibold mb-4">{error || "Video not found"}</h2>
                    <Button onClick={() => router.push('/')}>
                        Go to Home
                    </Button>
                </div>
            </div>
        );
    }

    const quality = video.settings?.adaptive?.qualities[0] && getVideoQuality(video.settings.adaptive.qualities[0].height);

    return (
        <div className="container py-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Video Player Section */}
                <div className="lg:col-span-2">
                    <div className="relative">
                        <PlyrPlayer
                            source={{
                                type: "video" as const,
                                sources: [video.provider === EVideoProvider.Local ? {
                                    src: `${process.env.NEXT_PUBLIC_API_URL}/video/resource/${video.id}/master.m3u8`,
                                    type: "application/x-mpegURL",
                                } : {
                                    src: video.videoUrl!, // id actually
                                    provider: providers[video.provider]
                                }]
                            }}
                            options={{
                                controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
                                settings: ['captions', 'quality', 'speed'],
                                previewThumbnails: video.provider === EVideoProvider.Local ? {
                                    src: `${process.env.NEXT_PUBLIC_API_URL}/video/resource/${video.id}/thumbnails.vtt`,
                                    enabled: video.settings?.thumbnailsCaptureInterval! > 0
                                } : {},
                                title: video.title
                            }}
                            onReady={handlePlayerReady}
                            className="border-border border rounded-lg"
                        />
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="absolute top-2 right-2 opacity-60 hover:opacity-100"
                            onClick={handleMinimize}
                        >
                            <MinimizeIcon size={16} className="mr-1" />
                            Minimize
                        </Button>
                    </div>

                    {/* Video Info */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-semibold mb-2">{video.title}</h1>
                            {canDelete && (
                                <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={handleDelete}
                                >
                                    <Trash2 size={18} className="mr-2" />
                                    Delete Video
                                </Button>
                            )}
                        </div>
                        <Separator className="my-4" />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {video.ownerSimplified && (
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => openUserProfileModal(video.ownerSimplified!.id)}>
                                        <Image
                                            src={UsersService.getUserAvatarUrl(video.ownerSimplified, true)!}
                                            alt={video.ownerSimplified.username}
                                            width={40}
                                            height={40}
                                            className="rounded-full border border-border"
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-medium">{video.ownerSimplified.username}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatTimeAgoPrecise(video.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {video.provider === EVideoProvider.Local && (
                                <div className="flex items-center">
                                    <div className="flex cursor-pointer items-center gap-2 border-r px-3 bg-secondary/40 hover:bg-secondary/60 py-2.5 rounded-l-lg transition-colors">
                                        <ThumbsUp size={20} className="text-muted-foreground" />
                                        <span className="text-sm">0</span>
                                    </div>
                                    <div className="flex  cursor-pointer items-center gap-2 px-3 py-2.5 bg-secondary/40 hover:bg-secondary/60 rounded-r-lg transition-colors">
                                        <Eye size={20} className="text-muted-foreground" />
                                        <span className="text-sm">0</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 bg-secondary/30 py-2 rounded-sm">
                            <Label className="text-md mx-4">Description</Label>
                            <Separator className="my-1" />
                            <p className="mt-3 mb-1 mx-4 text-sm whitespace-pre-wrap text-muted-foreground">{video.description ?
                                video.description : "No description provided"} </p>
                        </div>

                        {video.provider === EVideoProvider.Local && (
                                <div className="bg-secondary/30 rounded-sm p-4 mt-2">
                                    <div className="flex gap-2 flex-wrap">
                                        { Boolean(video.settings?.adaptive?.qualities?.length) && (
                                            <Badge variant="success">
                                                Adaptive
                                            </Badge>
                                        )}
                                        {quality && (
                                            <Badge variant="outline" className={quality.color}>
                                                {quality.label}
                                            </Badge>
                                        )}
                                        {video.duration && (
                                                <Badge variant="outline">
                                                    {formatDurationExtended(video.duration, { format: "full" })}
                                                </Badge>
                                        )}
                                        {video.size && (
                                                <Badge variant="outline">
                                                    {formatFileSize(video.size)}
                                                </Badge>
                                        )}

                                        <Badge variant={video.isPublic ? "success" : "secondary"}>
                                            {video.isPublic ? "Public" : "Private"}
                                        </Badge>
                                    </div>

                                </div>
                        )}


                        <Separator className="my-4" />
                        <div className="flex flex-col gap-4">
                            <h2 className="text-xl font-semibold">Comments</h2>
                            <div className="text-center text-muted-foreground py-8">
                                Comments are not implemented yet
                            </div>
                        </div>

                    </div>
                </div>

                {/* Sidebar - Related Videos (placeholder) */}
                <div className="lg:col-span-1">
                    <h2 className="text-xl font-semibold mb-4">Related Videos</h2>
                    <div className="text-center text-muted-foreground py-8">
                        Related videos are not implemented yet
                    </div>
                </div>
            </div>
        </div>
    );
}; 