"use client";

import React, { useRef} from 'react';
import {Separator} from "@/shared/ui/Separator";
import {useRouter} from 'next/navigation';
import {useNavigationStore} from "@/store/navigationStore";
import {VideoDropZone} from "@/views/Home/ui/VideoDropZone";
import useSWR from 'swr'
import {VideosService} from "@/shared/services/videosService";
import {Spinner} from "@/shared/ui/Loader";
import {VideoCard} from "@/widgets/video/VideoCard";
import {Input} from "@/shared/ui/Input";
import {Badge} from "@/shared/ui/Badge";
import {Button} from "@/shared/ui/Button";
import {EIcon, SvgIcon} from "@/shared/ui/Icon";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "@/shared/ui/Select";
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/shared/ui/ContextMenu";
import {openConfirmationModal} from "@/widgets/modals/ConfirmationModal";
import {toast, ToastVariant} from "@/shared/ui/Toast";
import {videoSortOptions} from "@/shared/constants/sortOptions";
import {useTitle} from "@/shared/hooks/useTitle";


/*export const VideoExample = () => {
    const playerRef = useRef<HTMLVideoElement>(null);

    return (
            <PlyrPlayer
                source={{
                    type: "video",
                    sources: [{
                        src:  API_URL + "/video/resource/c1f03f22-4caa-4c33-b23b-bde768deaf56/master.m3u8",
                        type: "application/x-mpegURL"
                    }]
                }}
                options={{
                    controls: [ 'play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen' ],
                    settings: [ 'captions', 'quality', 'speed', 'loop' ],
                    previewThumbnails: {
                        src: API_URL + "/video/resource/c1f03f22-4caa-4c33-b23b-bde768deaf56/thumbnails.vtt",
                        enabled: true
                    }
                }}
                width={"450px"} height={"auto"}
                className="rounded-xl border border-border"
            />

    );
};*/



export const HomePage = () => {
    const router = useRouter();
    const setData: (data: any) => void = useNavigationStore((state) => state.setData);
    const [offset, setOffset] = React.useState(0);
    const [limit, setLimit] = React.useState(10);
    const [allVideos, setAllVideos] = React.useState<any[]>([]);
    const [hasMore, setHasMore] = React.useState(true);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);
    const filterRef = useRef<string>("");
    const [currentFilter, setCurrentFilter] = React.useState("");
    const [orderBy, setOrderBy] = React.useState<string>("CreatedAt");
    const [orderByDescending, setOrderByDescending] = React.useState(true);
    useTitle("Home")

    const resetPagination = React.useCallback(() => {
        setOffset(0);
        setAllVideos([]);
        setHasMore(true);
    }, []);

    const { data, error, isLoading, mutate } = useSWR(
        `getVideos-${offset}-${limit}-${currentFilter}-${orderBy}-${orderByDescending}`,
        () => VideosService.getUserVideos({
            offset: offset,
            limit: limit,
            filter: currentFilter,
            descending: orderByDescending,
            orderBy: orderBy
        })
    );

    // Update the video list when new data is received
    React.useEffect(() => {
        if (data) {
            if (offset === 0) {
                // New search or first load
                setAllVideos(data);
            } else {
                // Load more
                setAllVideos(prev => [...prev, ...data]);
            }

            // If it is less than the limit, there is no more data available
            setHasMore(data.length === limit);
            setIsLoadingMore(false);
        }
    }, [data, offset, limit]);

    const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCurrentFilter(prev => {
            if(prev === filterRef.current) return prev; // No change in filter
            resetPagination();
            return filterRef.current
        });

    };

    const handleOrderByChange = (value: string) => {
        setOrderBy(value);
        resetPagination();
    };

    const handleDirectionChange = () => {
        setOrderByDescending(prev => !prev);
        resetPagination();
    };

    const loadMore = () => {
        if (!hasMore || isLoadingMore || isLoading) return;

        setIsLoadingMore(true);
        setOffset(prev => prev + limit);
    };

    React.useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop
                >= document.documentElement.offsetHeight - 1000) {
                loadMore();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasMore, isLoadingMore, isLoading]);

    return (
        <div className="flex h-full flex-col gap-2 sm:gap-4 relative p-4">
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                <Badge variant={"outline"} className="text-xl text-nowrap">
                    Your videos
                </Badge>
                <form className="flex w-full" onSubmit={onSearch}>
                    <Input
                        placeholder="Search videos"
                        className="w-full rounded-r-none border-r-0"
                        onChange={(e) => {
                            filterRef.current = e.target.value;
                        }}
                    />
                    <Select onValueChange={handleOrderByChange}>
                        <SelectTrigger className=" rounded-none text-xs px-1.5">
                            <SelectValue placeholder="Order by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Order by</SelectLabel>
                                {videoSortOptions.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}>
                                        {option.title}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Button variant={"outline"} className="rounded-none px-1.5 border-l-0 bg-secondary/40"
                            type="button"
                            onClick={handleDirectionChange}>
                        <SvgIcon icon={(orderByDescending ? EIcon.OrderDescending : EIcon.OrderAscending)} size={20} />
                    </Button>
                    <Button variant={"outline"} className="rounded-l-none border-l-0 bg-secondary/40 hidden sm:inline-block" type="submit">
                        Search
                    </Button>
                    <Button variant={"outline"} className="rounded-l-none border-l-0 bg-secondary/40 sm:hidden px-3" type="submit">
                        <SvgIcon icon={EIcon.Magnifier} size={20}/>
                    </Button>
                </form>
            </div>
            <Separator/>

            {isLoading && offset === 0 ? (
                <div className="w-full h-full flex-center">
                    <Spinner/>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                        {allVideos?.map((video) => (
                            <ContextMenu key={video.id}>
                                <ContextMenuTrigger>
                                    <VideoCard video={video} />
                                </ContextMenuTrigger>
                                <ContextMenuContent className="w-52">
                                    <ContextMenuItem className="text-red-400 font-medium"
                                    onClick={() => {
                                        openConfirmationModal({
                                            body: `Are you sure you want to delete the video "${video.title}"?`,
                                            destructiveYes: true,
                                            onYes: () => {
                                                VideosService.deleteVideo(video.id)
                                                    .then(() => {
                                                        setAllVideos(prev => prev.filter(v => v.id !== video.id));
                                                    })
                                                    .catch(() => {
                                                        toast.open({
                                                            variant: ToastVariant.Error,
                                                            body: `Failed to delete video`
                                                        });
                                                    });
                                            }
                                        })
                                    }}>
                                        Delete
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>

                        ))}
                    </div>

                    {hasMore && (
                        <div className="flex justify-center mt-6">
                            {isLoadingMore ? (
                                <div className="flex items-center gap-2">
                                    <Spinner />
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={loadMore}
                                    className="px-8"
                                >
                                    Load More
                                </Button>
                            )}
                        </div>
                    )}

                    {!hasMore && allVideos.length > 0 && (
                        <Badge variant={"outline"} className="mx-auto p-3 px-10 opacity-50 mb-6">
                            No more videos to load
                        </Badge>
                    )}

                    {!isLoading && allVideos.length === 0 && (
                        <div className="text-center text-gray-500 mt-12">
                            {currentFilter ? "No videos found for your search" : "No videos uploaded yet"}
                        </div>
                    )}
                </div>
            )}

            <VideoDropZone overlay successcallback={(f) => {
                setData({ file: f });
                router.push('/home/studio');
            }}>
            </VideoDropZone>

            <Button variant={"outline"} size={"auto"} className="fixed md:bottom-6 md:right-6 right-4 bottom-4 z-30 rounded-full p-1.5 md:p-3"
                    href={"home/studio"}>
                <SvgIcon icon={EIcon.Plus} size={25}/>
            </Button>
        </div>
    );
};