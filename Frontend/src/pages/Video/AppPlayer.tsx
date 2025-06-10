import {EVideoProvider, IVideoObject} from "@/shared/services/videosService";
import React, {FC, useCallback, useEffect} from "react";
import {Button} from "@/shared/ui/Button";
import {MinimizeIcon, Trash2} from "lucide-react";
import {Separator} from "@/shared/ui/Separator";
import {openUserProfileModal} from "@/widgets/modals/UserProfileModal";
import Image from "next/image";
import {UsersService} from "@/shared/services/usersService";
import {formatTimeAgoPrecise} from "@/shared/lib/formatters";
import {PlyrInstance, PlyrPlayer} from "@/widgets/player";
import {useVideoPlayerStore} from "@/store/videoPlayerStore";
import {useParams, useRouter} from "next/navigation";
import {isTouchDevice} from "@/shared/lib/utils";

interface IAppPlayerProps {
    video: IVideoObject;
    onReady: (player: PlyrInstance) => void;
    controlled: boolean;
    withFloating: boolean
}

export const providers = [
    "local",
    "youtube",
    "vimeo"
] as const;

const AppPlayerComponent: FC<IAppPlayerProps> = ( { video, onReady, controlled, withFloating } ) => {
    const params = useParams();
    const router = useRouter();

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

    const handlePlayerReady = useCallback((player: PlyrInstance) => {
        setPlayerInstance(player);
        // If we have a stored time position, set it
        if (storedVideoId === params?.id && currentTime > 0) {
            player.currentTime = currentTime;
        }

        if(!controlled) {
            const progress = player.elements.controls?.querySelector(".plyr__progress") as HTMLDivElement
            const onPointerDown = (e) => {
                e.stopPropagation();
                e.preventDefault();
            }
            progress.addEventListener('pointerdown', onPointerDown);
            if(isTouchDevice()) {
                progress.style.pointerEvents = "none"
            }
        }

        onReady(player);
    }, [setPlayerInstance, storedVideoId, params?.id, currentTime]);

    const handleMinimize = useCallback(() => {
        if (!video) return;

        // Save current player state before minimizing
        syncPlayerState();

        // Activate floating mode with current video
        setFloating(true);

        // Navigate back to home or previous page
        router.back();
    }, [video, syncPlayerState, setFloating, router]);

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

    const controls = ['progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'];
    const settings = ['captions', 'quality'];
    if(controlled) {
        settings.push('speed')
        controls.unshift('play-large', 'play');
    }

    return (
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
                    controls: controls,
                    settings: settings,
                    previewThumbnails: video.provider === EVideoProvider.Local ? {
                        src: `${process.env.NEXT_PUBLIC_API_URL}/video/resource/${video.id}/thumbnails.vtt`,
                        enabled: video.settings?.thumbnailsCaptureInterval! > 0
                    } : {},
                    title: video.title,
                    clickToPlay: controlled
                }}
                onReady={handlePlayerReady}
                className="border-border border rounded-lg"
            />
            { withFloating &&
                <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 opacity-60 hover:opacity-100"
                    onClick={handleMinimize}
                >
                    <MinimizeIcon size={16} className="mr-1" />
                    Minimize
                </Button>
            }

        </div>
    )
}

export const AppPlayer = React.memo(AppPlayerComponent);