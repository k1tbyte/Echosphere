"use client";

import React from 'react';
import { PlyrPlayer } from "@/widgets/player/PlyrPlayer";
import Link from "next/link";
import {Label} from "@/shared/ui/Label";
import {Separator} from "@/shared/ui/Separator";
import {DropZone} from "@/widgets/dropzone";
import { useRouter } from 'next/navigation';
import {useNavigationStore} from "@/store/navigationStore";
import {VideoDropZone} from "@/pages/Home/ui/VideoDropZone";


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
        </div>
    );
};