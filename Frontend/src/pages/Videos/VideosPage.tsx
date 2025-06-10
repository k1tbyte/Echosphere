"use client";

import React, {useRef, useState} from 'react';
import {Input} from "@/shared/ui/Input";
import {Button} from "@/shared/ui/Button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/shared/ui/Select";
import {EIcon, SvgIcon} from "@/shared/ui/Icon";
import {IVideoObject, VideosService} from "@/shared/services/videosService";
import useSWR from "swr";
import {Spinner} from "@/shared/ui/Loader";
import {VideoCard, VideoCardWithContext} from "@/widgets/video/VideoCard";
import {videoSortOptions} from "@/shared/constants/sortOptions";
import {useSession} from "next-auth/react";
import {EUserRole} from "@/types/user-role";
import {useTitle} from "@/widgets/player/hooks/useTitle";

export const VideosPage = () => {
    const [offset, setOffset] = useState(0);
    const [limit] = useState(30);
    const [allVideos, setAllVideos] = useState<IVideoObject[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const filterRef = useRef<string>("");
    const [searchValue, setSearchValue] = useState("");
    const [orderBy, setOrderBy] = useState<string>("CreatedAt");
    const [orderByDescending, setOrderByDescending] = useState(true);
    const {data: session, status} = useSession({ required: true });
    useTitle("Videos")

    const resetPagination = () => {
        setOffset(0);
        setAllVideos([]);
        setHasMore(true);
    };

    const { data: videos, isLoading } = useSWR(
        `public-videos-${limit}-${offset}-${searchValue}-${orderBy}-${orderByDescending}`,
        () => VideosService.getPublicVideos({
            offset,
            limit,
            filter: searchValue,
            orderBy,
            descending: orderByDescending,
            includeOwner: true
        }),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false
        }
    );

    React.useEffect(() => {
        if (videos) {
            if (offset === 0) {
                setAllVideos(videos);
            } else {
                setAllVideos(prev => [...prev, ...videos]);
            }
            setHasMore(videos.length === limit);
            setIsLoadingMore(false);
        }
    }, [videos, offset, limit]);

    const loadMore = () => {
        if (!hasMore || isLoadingMore || isLoading) return;
        setIsLoadingMore(true);
        setOffset(prev => prev + limit);
    };

    const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSearchValue(prev => {
            if (prev === filterRef.current) return prev;
            resetPagination();
            return filterRef.current;
        });
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

    const localId = Number(session?.user.id) || -1;

    return (
        <div className="p-4">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <form onSubmit={onSearch} className="flex gap-2 flex-1">
                        <Input
                            placeholder="Search videos"
                            className="w-full"
                            onChange={(e) => {
                                filterRef.current = e.target.value;
                            }}
                        />
                        <Button variant={"outline"} className="px-6 hidden sm:flex" type="submit">
                            Search
                        </Button>
                        <Button variant={"outline"} className="px-3 sm:hidden" type="submit">
                            <SvgIcon icon={EIcon.Magnifier} size={20}/>
                        </Button>
                    </form>

                    <div className="flex gap-2 items-center">
                        <Select
                            value={orderBy}
                            onValueChange={value => {
                                setOrderBy(value);
                                resetPagination();
                            }}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Sort by"/>
                            </SelectTrigger>
                            <SelectContent>
                                {videoSortOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setOrderByDescending(prev => !prev);
                                resetPagination();
                            }}
                        >
                            <SvgIcon
                                icon={orderByDescending ? EIcon.OrderDescending : EIcon.OrderAscending}
                                size={20}
                            />
                        </Button>
                    </div>
                </div>

                {(isLoading && offset === 0) || status !== "authenticated" ? (
                    <div className="flex-center py-8">
                        <Spinner/>
                    </div>
                ) : allVideos.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        {searchValue ? "No videos found for your search" : "No videos found"}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {allVideos.map(video => {
                            const isOwned = localId === video.ownerSimplified?.id;
                            return (
                                isOwned || session?.user.role >= EUserRole.Admin ?
                                <VideoCardWithContext key={video.id} video={video} isOwned={isOwned} setVideos={setAllVideos} /> :
                                <VideoCard key={video.id} video={video} isOwned={isOwned}/>
                            );
                        })}
                    </div>
                )}

                {hasMore && (
                    <div className="flex justify-center mt-6">
                        {isLoadingMore ? (
                            <div className="flex items-center gap-2">
                                <Spinner/>
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
            </div>
        </div>
    );
};