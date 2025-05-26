"use client";

import React from 'react';
import { Sidebar } from "./ui/Sidebar";
import { TopNavbar } from "./ui/TopNavbar";
import { PlyrPlayer } from "@/widgets/player/PlyrPlayer";

export const HomePage = () => {
    return (
        <div className="flex h-svh p-2 gap-3">
            <Sidebar className="h-full" />

            <div className="flex w-full flex-col gap-3">
                <TopNavbar />
                <main className="bg-background/75 border-border border rounded-sm flex-1 overflow-auto p-4">
                    <div className="flex flex-col gap-4">
                        <PlyrPlayer
                            height={"50%"}
                            width={"50%"}
                            source={{
                                type: 'video',
                                sources: [
                                    {
                                        src:
                                            "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4",
                                        type: "video/mp4",
                                        size: 720,
                                    },
                                ]
                            }}
                            containerStyle={{
                                border: '1px solid #333',
                                borderRadius: '8px',
                                margin: '0 auto'
                            }}
                            options={{
                                controls: [
                                    'play-large', 'play', 'progress', 'current-time',
                                    'mute', 'volume', 'settings', 'airplay', 'pip', 'fullscreen'
                                ]
                            }}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
};