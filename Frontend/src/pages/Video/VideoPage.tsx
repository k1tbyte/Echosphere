"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { IVideoObject, VideosService, EVideoProvider } from "@/shared/services/videosService";
import { PlyrPlayer } from "@/widgets/player";
import { Spinner } from "@/shared/ui/Loader";
import { Badge } from "@/shared/ui/Badge";
import { Label } from "@/shared/ui/Label";
import { formatDuration, formatFileSize, formatTimeAgoPrecise, getVideoQuality } from "@/shared/lib/formatters";
import Image from "next/image";
import { UsersService } from "@/shared/services/usersService";
import { openUserProfileModal } from "@/widgets/modals/UserProfileModal";
import { EIcon, SvgIcon } from "@/shared/ui/Icon";
import { Separator } from "@/shared/ui/Separator";
import { ThumbsUp, Eye } from "lucide-react";

const providers = [
    "local",
    "youtube",
    "vimeo"
] as const;

export const VideoPage = () => {
    const params = useParams();
    const [video, setVideo] = useState<IVideoObject>();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadVideo = async () => {
            if (!params?.id) return;

            try {
                const videoData = await VideosService.getPublicVideos({
                    offset: 0,
                    limit: 1,
                    filter: params.id as string,
                    includeOwner: true
                });
                if (videoData.length > 0) {
                    setVideo(videoData[0]);
                }
            } catch (error) {
                console.error('Failed to load video:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadVideo();
    }, [params?.id]);

    if (isLoading || !video) {
        return (
            <div className="flex-center py-8">
                <Spinner />
            </div>
        );
    }

    const quality = video.settings?.adaptive?.qualities[0] && getVideoQuality(video.settings.adaptive.qualities[0].height);

    return (
        <div className="container py-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Video Player Section */}
                <div className="lg:col-span-2">
                    <div className="rounded-lg overflow-hidden border border-border">
                        <PlyrPlayer
                            source={{
                                type: "video",
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
                                } : undefined
                            }}
                        />
                    </div>

                    {/* Video Info */}
                    <div className="mt-4">
                        <h1 className="text-2xl font-semibold mb-2">{video.title}</h1>
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
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <ThumbsUp size={20} className="text-muted-foreground" />
                                        <span className="text-sm">0</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Eye size={20} className="text-muted-foreground" />
                                        <span className="text-sm">0</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {video.provider === EVideoProvider.Local && (
                            <>
                                <Separator className="my-4" />
                                <div className="bg-secondary/30 rounded-lg p-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {quality && (
                                            <div className="flex flex-col gap-1">
                                                <Label className="text-xs text-muted-foreground">Quality</Label>
                                                <Badge variant="outline" className={quality.color}>
                                                    {quality.label}
                                                </Badge>
                                            </div>
                                        )}
                                        {video.duration && (
                                            <div className="flex flex-col gap-1">
                                                <Label className="text-xs text-muted-foreground">Duration</Label>
                                                <Badge variant="outline">
                                                    {formatDuration(video.duration)}
                                                </Badge>
                                            </div>
                                        )}
                                        {video.size && (
                                            <div className="flex flex-col gap-1">
                                                <Label className="text-xs text-muted-foreground">Size</Label>
                                                <Badge variant="outline">
                                                    {formatFileSize(video.size)}
                                                </Badge>
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-xs text-muted-foreground">Visibility</Label>
                                            <Badge variant={video.isPublic ? "success" : "secondary"}>
                                                {video.isPublic ? "Public" : "Private"}
                                            </Badge>
                                        </div>
                                    </div>
                                    {video.description && (
                                        <div className="mt-4">
                                            <Label className="text-xs text-muted-foreground">Description</Label>
                                            <p className="mt-1 text-sm whitespace-pre-wrap">{video.description}</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {video.provider === EVideoProvider.Local && (
                            <>
                                <Separator className="my-4" />
                                <div className="flex flex-col gap-4">
                                    <h2 className="text-xl font-semibold">Comments</h2>
                                    <div className="text-center text-muted-foreground py-8">
                                        Comments are not implemented yet
                                    </div>
                                </div>
                            </>
                        )}
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