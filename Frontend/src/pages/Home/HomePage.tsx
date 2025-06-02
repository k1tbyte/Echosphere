"use client";

import React, {FC, useEffect, useRef} from 'react';

import Link from "next/link";
import {Label} from "@/shared/ui/Label";
import {Separator} from "@/shared/ui/Separator";
import {DropZone} from "@/widgets/dropzone";
import { useRouter } from 'next/navigation';
import {useNavigationStore} from "@/store/navigationStore";
import {VideoDropZone} from "@/pages/Home/ui/VideoDropZone";
import dynamic from "next/dynamic";
import {  PlyrPlayer } from "@/widgets/player";
import useSWR from 'swr'
import {EVideoStatus, IVideoObject, VideosService} from "@/shared/services/videosService";
import {Spinner} from "@/shared/ui/Loader";
import {VideoCard} from "@/widgets/video/VideoCard";


export const VideoExample = () => {
    const playerRef = useRef<HTMLVideoElement>(null);

    return (
            <PlyrPlayer
                source={{
                    type: "video",
                    sources: [{
                        src: "https://localhost:7245/api/v2/video/resource/c1f03f22-4caa-4c33-b23b-bde768deaf56/master.m3u8",
                        type: "application/x-mpegURL"
                    }]
                }}
                options={{
                    controls: [ 'play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen' ],
                    settings: [ 'captions', 'quality', 'speed', 'loop' ],
                    previewThumbnails: {
                        src: "https://localhost:7245/api/v2/video/resource/c1f03f22-4caa-4c33-b23b-bde768deaf56/thumbnails.vtt",
                        enabled: true
                    }
                }}
                width={"450px"} height={"auto"}
                className="rounded-xl border border-border"
            />

    );
};



export const HomePage = () => {
    const router = useRouter();
    const setData: (data: any) => void = useNavigationStore((state) => state.setData);
    const [offset, setOffset] = React.useState(0);
    const [limit, setLimit] = React.useState(30);
    const { data, error, isLoading, } = useSWR(`getVideos-${offset}-${limit}`, () => VideosService.getVideos({
        offset: offset,
        limit: limit
    }))



    return (
        <div className="flex h-full flex-col gap-4 relative p-4">
            <Label className="text-2xl" >
                Your videos library
            </Label>
            <Separator/>
            { isLoading ? <div className="w-full h-full flex-center"><Spinner/></div> :
                <div className="flex flex-col gap-6">
                    {/* Сетка видео */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                        {data?.map((video) => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </div>
                </div>
            }

            <VideoDropZone overlay successcallback={(f) => {
                setData({ file: f });
                router.push('/home/studio');
            }}>

            </VideoDropZone>
   {/*         <div className="w-full h-auto">
                <VideoExample/>
            </div>*/}
        </div>
    );
};