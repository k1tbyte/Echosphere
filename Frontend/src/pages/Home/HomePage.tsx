"use client";

import React from 'react';
import { PlyrPlayer } from "@/widgets/player/PlyrPlayer";
import Link from "next/link";
import {Label} from "@/shared/ui/Label";
import {Separator} from "@/shared/ui/Separator";
import {DropZone} from "@/widgets/dropzone";
import { useRouter } from 'next/navigation';
import {useNavigationStore} from "@/store/navigationStore";


export const HomePage = () => {
    const router = useRouter();
    const setData = useNavigationStore((state) => state.setData);

    const handleFileDrop = (file: File) => {
        setData(file);
        router.push('/home/studio');
    };

    return (
        <div className="flex h-full flex-col gap-4 relative">
            <Label className="text-2xl" >
                Recently Watched
            </Label>
            <Separator/>

            <DropZone
                overlay
                className={"h-full"}
                accept="video/*"
                promptText="Drop video here"
                description="Supports MP4, WebM, MOV, AVI"
                onFileDrop={handleFileDrop}
            />
        </div>
    );
};