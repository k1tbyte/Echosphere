import React, {FC, useEffect, useRef} from "react";
import {EVideoProvider, EVideoStatus, IVideoObject, VideosService} from "@/shared/services/videosService";
import {formatDuration, formatFileSize, formatTimeAgoPrecise, getVideoQuality} from "@/shared/lib/formatters";
import {PlyrPlayer, type PlyrProvider } from "@/widgets/player";
import Image from "next/image";
import {Badge} from "@/shared/ui/Badge";
import {Label} from "@/shared/ui/Label";
import {EIcon, SvgIcon} from "@/shared/ui/Icon";
import {Progress} from "@/shared/ui/Progress/Progress";
import {UsersService} from "@/shared/services/usersService";
import {openUserProfileModal} from "@/widgets/modals/UserProfileModal";
import { useRouter } from "next/navigation";
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/shared/ui/ContextMenu";
import {openConfirmationModal} from "@/widgets/modals/ConfirmationModal";
import {toast, ToastVariant} from "@/shared/ui/Toast";

interface IVideoCardProps {
    video: IVideoObject;
    isOwned?: boolean;
}


const providers: PlyrProvider[] = [
    // @ts-ignore
    "local",
    "youtube",
    "vimeo"
]

const getCoverFromStatus = (video: IVideoObject) => {
    switch (video.status) {
        case EVideoStatus.Ready:
            return (
                <Image  loading={"lazy"}
                    className="object-cover"
                    src={VideosService.getVideoPreviewUrl(video)}
                    alt={video.title}
                    fill
                />
            )
        case EVideoStatus.Pending:
            const progress = video.uploadSize ? Math.round((video.uploadSize / video.size!) * 100) : 0;
            return (
                <div className="flex flex-col h-full justify-end relative">
                    <Badge variant={"outline"} className="absolute translate-center text-center">
                        <SvgIcon icon={EIcon.CircleFilled} size={8} className="mr-1"/>
                        Uploading... {progress}%
                    </Badge>
                    <br/>
                    <div className="w-full flex justify-center">
                        <Badge variant={"secondary"} className="mb-2">
                            {formatFileSize(video.uploadSize || 0)}
                        </Badge>
                    </div>

                    <Progress value={progress} className="rounded-none"/>
                </div>
            )
        case EVideoStatus.Failed:
        case EVideoStatus.Blocked:
            return (
                <Badge variant={"destructive"} className="absolute translate-center py-2">
                    <SvgIcon icon={EIcon.CancelBlock} size={16} className="mr-1"/>
                    { video.status === EVideoStatus.Failed ? "Failed to process" : "This video is blocked"}
                </Badge>
            )
        case EVideoStatus.Processing:
        case EVideoStatus.Queued:
            return (
                <Badge variant={"progress"} className="absolute translate-center">
                    <SvgIcon icon={EIcon.CircleFilled} size={8} className="mr-1"/>
                    {video.status === EVideoStatus.Processing ? "Processing..." : "In the queue for processing"}
                </Badge>
            )
    }
}

export const VideoCard: FC<IVideoCardProps> = ({ video, isOwned = true }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [withPlayer, setWithPlayer] = React.useState(false);
    const router = useRouter();

    useEffect(() => {
        if(!containerRef.current || video.status != EVideoStatus.Ready) return;

        let timeoutId = 0;
        let thresholdTimer = 0;

        const onPointerOver = () => {
            clearTimeout(timeoutId);
            clearTimeout(thresholdTimer);
            timeoutId = window.setTimeout(() => {
                setWithPlayer(true);
            }, 1500);
        }

        const onPointerLeave = () => {
            clearTimeout(thresholdTimer);
            thresholdTimer = window.setTimeout(() => {
                clearTimeout(timeoutId);
                setWithPlayer(false);
            }, 700);
        }

        containerRef.current.addEventListener('pointerover', onPointerOver)
        containerRef.current.addEventListener('pointerleave', onPointerLeave)
        return () => {
            containerRef.current?.removeEventListener('pointerover', onPointerOver);
            containerRef.current?.removeEventListener('pointerleave', onPointerLeave);
        }
    },[video]);

    // @ts-ignore
    const quality = getVideoQuality(video.settings?.adaptive?.qualities[0].height);

    const handleClick = (e: React.MouseEvent) => {
        // Don't navigate if clicking on the owner's profile
        if ((e.target as HTMLElement).closest('.owner-profile')) {
            return;
        }
        router.push(`/video/${video.id}`);
    };

    console.log(process.env.NEXT_PUBLIC_API_URL + `/video/resource/${video.id}/preview`);
    return (
        <div ref={containerRef} onClick={handleClick} className="flex flex-col bg-background/50 rounded-md border hover:bg-secondary/30 transition-all hover:scale-105 hover:z-10 cursor-pointer">
            <div className="relative w-full aspect-video border-b rounded-t-lg overflow-hidden">
                {withPlayer ?
                    <PlyrPlayer
                        source={{
                            type: "video",
                            sources: [ video.provider === EVideoProvider.Local ? {
                                src: process.env.NEXT_PUBLIC_API_URL + `/video/resource/${video.id}/master.m3u8`,
                                type: "application/x-mpegURL",
                            } : {
                                src: video.videoUrl!, // id actually
                                provider: providers[video.provider]
                            }]
                        }}
                        options={{
                            storage: { enabled: false },
                            muted: true,
                            controls: [ 'progress', 'current-time' ],
                            invertTime: false,
                            hideControls: false,
                            autoplay: true,
                            previewThumbnails: {
                                src: process.env.NEXT_PUBLIC_API_URL + `/video/resource/${video.id}/thumbnails.vtt`,
                                enabled: video.settings?.thumbnailsCaptureInterval! > 0
                            }
                        }}
                    /> : getCoverFromStatus(video)
                }

                { !withPlayer &&
                    <>
                        {video.duration && (
                            <div className={"absolute bottom-2 right-2 rounded-sm px-2 py-1 pointer-events-none bg-secondary/70 text-xs font-medium"}>
                                {formatDuration(video.duration)}
                            </div>
                        )}

                        { quality &&
                            <div className="flex gap-2 absolute left-2 top-2 bg-background rounded-sm">
                                <Badge variant={"default"} className={`${quality.color}`}>
                                    {quality.label}
                                </Badge>
                            </div>
                        }

                        { video.provider > EVideoProvider.Local &&
                            <div className="absolute top-2 left-2 bg-secondary/40 opacity-90 rounded-sm">
                                {
                                    video.provider === EVideoProvider.YouTube ?
                                        <SvgIcon icon={EIcon.YouTube} className="text-red-500 mx-0.5" size={40}/> :
                                        <SvgIcon icon={EIcon.Vimeo} className="text-sky-500 mx-2 my-1" size={30}/>
                                }
                            </div>
                        }

                        <div className="bg-background rounded-sm absolute top-2 right-2 flex opacity-85">
                            <Badge variant={(video.isPublic ? "success" : "progress")}>
                                {video.isPublic ? "Public" : "Private"}
                            </Badge>
                        </div>

                    </>
                }
            </div>


            <div className="flex py-2 mx-2.5 grow-0">
                { video.ownerSimplified &&
                    <div className="mr-2 cursor-pointer owner-profile" onClick={(e) => {
                        e.stopPropagation()
                        openUserProfileModal(video.ownerSimplified!.id);
                    }}>
                        <Image src={UsersService.getUserAvatarUrl(video.ownerSimplified!)!}
                               alt={video.ownerSimplified?.username!}
                               width={40} height={40} className={"rounded-full border border-border" + (isOwned ? " border-green-400" : " ")}
                        />
                    </div>
                }

                <div className="flex flex-col w-full overflow-hidden">
                    <h3 className="font-medium text-sm line-clamp-2 leading-tight text-nowrap overflow-ellipsis">
                        {video.title}
                    </h3>

                    <div className="flex flex-col gap-1 text-muted-foreground">

                        <div className="flex justify-between items-center gap-2">
                            <div className="flex gap-x-1 md:flex-row flex-col">
                                { video.ownerSimplified &&
                                    <Label className="text-xs font-medium">
                                        Uploaded by {isOwned ? "you" : video.ownerSimplified.username} •
                                    </Label>
                                }
                                <Label className="font-normal text-xs">
                                    {formatTimeAgoPrecise(video.createdAt, { justNowThreshold: 10, showJustNow: true })}
                                </Label>
                            </div>


                            {video.size && isOwned && (
                                <Badge variant={"default"} className="py-0.5">
                                    {formatFileSize(video.size)}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export const VideoCardWithContext: FC<IVideoCardProps & { setVideos: React.Dispatch<React.SetStateAction<IVideoObject[]>> }> =
    ({ video, isOwned, setVideos }) => {

    const onDelete = () => {
        openConfirmationModal({
            body: `Are you sure you want to delete the video "${video.title}"? Uploaded by ${video.ownerSimplified?.username}`,
            destructiveYes: true,
            onYes: () => {
                VideosService.deleteVideo(video.id)
                    .then(() => {
                        setVideos(prev => prev.filter(v => v.id !== video.id));
                    })
                    .catch(() => {
                        toast.open({
                            variant: ToastVariant.Error,
                            body: `Failed to delete video`
                        });
                    });
            }
        })
    }

        return  (
                <ContextMenu>
                <ContextMenuTrigger>
                    <VideoCard key={video.id} video={video}
                               isOwned={isOwned}/>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-52">
                    <ContextMenuItem className="text-red-400 font-medium"
                                     onClick={onDelete}>
                        Delete
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        )
}