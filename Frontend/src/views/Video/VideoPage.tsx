"use client";

import React, {useEffect, useState, useCallback } from 'react';
import {useParams, useRouter} from 'next/navigation';
import {EVideoProvider, IVideoObject, VideosService} from "@/shared/services/videosService";
import {Spinner} from "@/shared/ui/Loader";
import {Badge} from "@/shared/ui/Badge";
import {Label} from "@/shared/ui/Label";
import {formatDurationExtended, formatFileSize, formatTimeAgoPrecise, getVideoQuality} from "@/shared/lib/formatters";
import Image from "next/image";
import {UsersService} from "@/shared/services/usersService";
import {openUserProfileModal} from "@/widgets/modals/UserProfileModal";
import {Separator} from "@/shared/ui/Separator";
import {Eye, ThumbsUp, Trash2} from "lucide-react";
import {useSession} from "next-auth/react";
import {EUserRole} from "@/types/user-role";
import {useBreadcrumbs} from "@/store/uiMetaStore";
import {openConfirmationModal} from "@/widgets/modals/ConfirmationModal";
import {toast, ToastVariant} from "@/shared/ui/Toast";
import {Button} from "@/shared/ui/Button";
import {AppPlayer} from "@/views/Video/AppPlayer";
import {useEcho} from "@/providers/EchoProvider";
import {useRoomStore} from "@/store/roomStore";
import {ERoomEventType, TypeRoomEventCallback} from "@/shared/services/echoHubService";
import {PlyrInstance} from "@/widgets/player";
import {Head} from "@react-email/components";
import {useTitle} from "@/widgets/player/hooks/useTitle";

// Define type for PlyrSource including title property
// This can be removed since we've updated the types in index.ts
/*interface EnhancedPlyrOptions extends Omit<import('plyr').Options, 'title'> {
    title?: string;
}*/

let eventTimerId = 0;

export const VideoPage = () => {
    const params = useParams();
    const router = useRouter();
    const { data: session, status } = useSession({ required: true });
    const { setBreadcrumbs } = useBreadcrumbs();
    const [video, setVideo] = useState<IVideoObject>();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>();
    const echo = useEcho();
    const roomStore = useRoomStore();
    const hub = echo?.echoHub;
    const initialized = React.useRef(false);
    const eventTimerIdRef = React.useRef<number>(0);
    const lockerRef = React.useRef(false)
    const playerRef = React.useRef<PlyrInstance | undefined | null>(null);

    const sendEcho = () => {
        if(lockerRef.current || !roomStore.roomId || !playerRef.current) {
            return;
        }

        lockerRef.current = true;
        hub!.sendRoomEvent(roomStore.roomId, ERoomEventType.VideoStateChange, {
            currentTime: playerRef.current.currentTime,
            isPlaying: playerRef.current.playing,
            videoId: video?.id,
            speed: playerRef.current.speed
        }).finally(() => lockerRef.current = false);
    }

    const onReady = useCallback((player: PlyrInstance) => {
        playerRef.current = player;

        if (roomStore.roomId && (roomStore.isRoomOwner || roomStore.ownerId === Number(session?.user.id))) {
            player.on('play', () => sendEcho())
            player.on('pause', () => sendEcho())
            player.on('seeked', () => sendEcho())
        }
    },[]);


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

    useTitle(video?.title)

    // Clear breadcrumbs when navigating away
    useEffect(() => {
        return () => {
            setBreadcrumbs([]);
        };
    }, [setBreadcrumbs]);

    useEffect(() => {
        if(!hub || !session?.user || !video?.id || !roomStore.roomId) return;

        if(roomStore.isRoomOwner || roomStore.ownerId === Number(session.user.id)) {
            window.clearTimeout(eventTimerId);
            eventTimerId = window.setTimeout(() => {
                initialized.current = true;
                hub.sendRoomEvent(roomStore.roomId!, ERoomEventType.VideoOpen, {
                    id: video?.id,
                    title: video.title
                })


                window.clearInterval(eventTimerIdRef.current);
                eventTimerIdRef.current = window.setInterval(() => {
                    const player = playerRef.current;
                    if(!player) {
                        return;
                    }
                    sendEcho();
                }, 1500);

            }, 300); // Debounce to avoid sending too many events in a short time
        }
    }, [roomStore, hub, status, video,]);

    useEffect(() => {
        if(!hub) return;

        const handleRoomEvent = (data: TypeRoomEventCallback) => {
            const player = playerRef.current;
            if(!player) {
                return;
            }

            if(data.action === ERoomEventType.VideoStateChange) {
                if(player.playing !== data.param.isPlaying) {
                    if(data.param.isPlaying) {
                        console.log("Playing video from room event");
                        player.play();
                    } else {
                        console.log("Pausing video from room event");
                        player.pause();
                    }
                }

                const timeDiff = Math.abs(player.currentTime - data.param.currentTime);
                if(timeDiff > 0.5 || isNaN(player.currentTime)) {
                    console.log("Seeking video to", data.param.currentTime);
                    player.currentTime = data.param.currentTime;
                }
                if(player.speed !== data.param.speed) {
                    console.log("Changing video speed to", data.param.speed);
                    player.speed = data.param.speed;
                }
            }
        }

        hub.OnRoomEvent.subscribe(handleRoomEvent);
        return () => {
            hub.OnRoomEvent.unsubscribe(handleRoomEvent);
        }
    }, [echo?.state]);

    useEffect(() => {
        return () => {
            if(initialized.current && roomStore.roomId) {
                hub?.sendRoomEvent(roomStore.roomId, ERoomEventType.VideoClose, {
                    id: video?.id,
                    isVideoPublic: video?.isPublic
                })
            }
            window.clearTimeout(eventTimerId);
            window.clearInterval(eventTimerIdRef.current);
        }
    }, [video]);

    useEffect(() => {
       if(!video) {
           return;
       }

       if(roomStore.currentVideo === undefined || (video.id === roomStore.currentVideo?.id && !roomStore.currentVideo.onPage)) {
           roomStore.setCurrentVideo({
               onPage: true,
               title: video.title,
               id: video.id
           })
       }

       return () => {

           if(roomStore.currentVideo?.onPage) {
               setTimeout(() => {
                   roomStore.setCurrentVideo( initialized.current ? undefined : {
                       onPage: false,
                       title: video.title,
                       id: video.id
                   })
               }, 200)
           }
       }
    },[video])

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


    if (isLoading || status !== "authenticated") {
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
                    <AppPlayer video={video} onReady={onReady}
                               withFloating={!roomStore.roomId}
                               controlled={!roomStore.roomId ||
                        (!!roomStore.roomId && (roomStore.isRoomOwner || roomStore.ownerId === Number(session?.user.id)))}/>

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