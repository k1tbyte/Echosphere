"use client";

import {PlyrPlayer} from "@/widgets/player/PlyrPlayer";
import React from "react";

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/shared/ui/Button/Button";
import { Upload } from "lucide-react";

export const LocalVideoPlayer = () => {
    const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
    const [videoName, setVideoName] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (localVideoUrl) {
                URL.revokeObjectURL(localVideoUrl);
            }
        };
    }, [localVideoUrl]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;

        if (!files || files.length === 0) {
            return;
        }

        const file = files[0];

        if (!file.type.startsWith('video/')) {
            alert('Please select a valid video file.');
            return;
        }

        const videoUrl = URL.createObjectURL(file);

        if (localVideoUrl) {
            URL.revokeObjectURL(localVideoUrl);
        }

        setLocalVideoUrl(videoUrl);
        setVideoName(file.name);
    };

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <Button
                    onClick={handleUploadClick}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    <Upload className="h-4 w-4" />
                    Open local video
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="video/*"
                    className="hidden"
                />
                {videoName && (
                    <div className="text-sm text-muted-foreground">
                        {videoName}
                    </div>
                )}
            </div>

            {localVideoUrl ? (
                <PlyrPlayer
                    source={{
                        type: 'video',
                        sources: [
                            {
                                src: localVideoUrl,
                                type: 'video/mp4'
                            }
                        ]
                    }}
                    containerStyle={{
                        border: '1px solid #333',
                        borderRadius: '8px'
                    }}
                    width="100%"
                    aspectRatio="16:9"
                />
            ) : (
                <div className="flex items-center justify-center border border-dashed border-border rounded-lg p-8 bg-background/50">
                    <p className="text-muted-foreground">
                        Select a video file to play it here
                    </p>
                </div>
            )}
        </div>
    );
};

export const StudioPage = () => {
    return (
        <LocalVideoPlayer/>
    )
/*    return (
        <div className="container mx-auto">
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
    )*/
}