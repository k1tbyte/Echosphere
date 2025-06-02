"use client";

import React, {useRef} from 'react';

import Link from "next/link";
import {Label} from "@/shared/ui/Label";
import {Separator} from "@/shared/ui/Separator";
import {DropZone} from "@/widgets/dropzone";
import { useRouter } from 'next/navigation';
import {useNavigationStore} from "@/store/navigationStore";
import {VideoDropZone} from "@/pages/Home/ui/VideoDropZone";
import dynamic from "next/dynamic";
import {  PlyrPlayer } from "@/widgets/player";


export const VideoExample = () => {
    const playerRef = useRef<HTMLVideoElement>(null);

    const handleReady = (player) => {
        console.log('Player ready!', player);
    };

    return (
            <PlyrPlayer
                source={{
                    type: "video",
                    sources: [{
                        src: "https://localhost:7245/api/v2/video/playhls/c1f03f22-4caa-4c33-b23b-bde768deaf56/master.m3u8",
                        type: "application/x-mpegURL"
                    }]
                }}
                options={{
                    controls: [ 'play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen' ],
                    settings: [ 'captions', 'quality', 'speed', 'loop' ],
                    previewThumbnails: {
                        src: "https://localhost:7245/api/v2/video/playhls/c1f03f22-4caa-4c33-b23b-bde768deaf56/thumbnails.vtt",
                        enabled: true
                    }
                }}
                onReady={handleReady}
                width={"450px"} height={"auto"}
                className="rounded-xl border border-border"
            />

    );
};

export const HomePage = () => {
    const router = useRouter();
    const setData: (data: any) => void = useNavigationStore((state) => state.setData);


    return (
        <div className="flex h-full flex-col gap-4 relative p-4">
            <Label className="text-2xl" >
                Recently Watched
            </Label>
            <Separator/>

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