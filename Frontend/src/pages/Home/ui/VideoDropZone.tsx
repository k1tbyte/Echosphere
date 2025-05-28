"use client";

import React, {FC} from "react";
import {DropZone, DropZoneProps} from "@/widgets/dropzone";

// @ts-ignore
export const VideoDropZone: FC<DropZoneProps & { successcallback: (file: File) => void }> =
    ({ successcallback, ...props } ) => {
    const handleFileDrop = (file: File) => {
        if (!file.type.startsWith('video/')) {
            return 'Please upload a valid video file';
        }
        successcallback(file);
    }

    return <DropZone {...props}
                     accept="video/*"
                     promptText="Drop video here"
                     description="Supports MP4, WebM, MOV, AVI"
                     onFileDrop={handleFileDrop}
    />
}