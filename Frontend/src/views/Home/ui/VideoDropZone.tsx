"use client";

import React, {FC} from "react";
import {DropZone, DropZoneProps} from "@/widgets/dropzone";
import {createFileFingerprint} from "@/shared/lib/cryptography";
import {modal} from "@/shared/ui/Modal";
import {VideoUploadService} from "@/shared/services/videoUploadService";
import {ResumeVideoUploadModal} from "@/views/Home/ui/ResumeVideoUploadModal";

// @ts-ignore
export const VideoDropZone: FC<DropZoneProps & { successcallback: (file: File) => void }> =
    ({ successcallback, ...props } ) => {
    const handleFileDrop = (file: File) => {
        if (!file.type.startsWith('video/')) {
            return 'Please upload a valid video file';
        }

        createFileFingerprint(file).then(async (fingerprint) => {
            fingerprint = file.size + fingerprint
            // @ts-ignore
            file.fingerprint = fingerprint;
            const pending = VideoUploadService.getSavedUploadState(fingerprint);
            if(pending) {
                try {
                    const video = await VideoUploadService.getVideo(pending.videoId);
                    modal.open( {
                        title: "Continue uploading video",
                        // @ts-ignore
                        body: <ResumeVideoUploadModal video={video} file={file}/>
                    });
                    return;
                } catch {
                    VideoUploadService.clearUploadState(fingerprint);
                }
            }

            successcallback(file);
        });
    }

    return <DropZone {...props}
                     accept="video/*"
                     promptText="Drop video here"
                     description="Supports MP4, WebM, MOV, AVI"
                     onFileDrop={handleFileDrop}
    />
}