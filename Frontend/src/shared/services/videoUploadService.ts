import {toast, ToastVariant} from '../ui/Toast';
import fetcher, {send} from "@/shared/lib/fetcher";

export enum EUploadProgressState {
    Started = 0,
    Uploading = 1,
    Completed = 2,
    Error = 3,
}

interface VideoMetadata {
    title: string;
    description?: string;
    duration?: number;
    previewUrl?: string;
    provider?: number; // EVideoProvider
    id?: string;
    sizeBytes?: number;
    previewSizeBytes?: number;
    thumbnailsCaptureInterval?: number;
}

interface UploadProgress {
    bytesUploaded: number;
    totalBytes: number;
    percent: number;
    videoId: string;
    speed?: number; // Speed in bytes per second
    state: EUploadProgressState;
}

interface UploadState {
    videoId: string;
    fingerprint: string;
    fileName: string;
    fileSize: number;
}

type ProgressCallback = (progress: UploadProgress) => void;
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB

export class VideoUploadService {
    private static readonly UPLOAD_STATE_PREFIX = "video_upload_";
    private static readonly API_URL = process.env.NEXT_PUBLIC_API_URL!;


    public static async startNewUploadFile(
        file: File,
        metadata: VideoMetadata,
        fingerprint: string,
        previewBlob?: Blob
    ): Promise<string> {
        const metadataCopy = { ...metadata };
        metadataCopy.sizeBytes = file.size;

        if (previewBlob) {
            metadataCopy.previewSizeBytes = previewBlob.size;
        }

        const videoId = (await this.initiateUpload(metadataCopy, previewBlob))!;

        this.saveUploadState({
            videoId,
            fingerprint: fingerprint!,
            fileName: file.name,
            fileSize: file.size
        });

        return videoId;
    }

    public static async startNewUpload(metadata: VideoMetadata): Promise<any> {
        return this.initiateUpload(metadata)
    }

    /**
     * Initiate the upload and get the video ID
     */
    private static async initiateUpload(
        metadata: VideoMetadata,
        previewBlob?: Blob
    ): Promise<string | null> {
        const infoParam = btoa(JSON.stringify(metadata));
        const url = `${this.API_URL}/video/initiateupload?info=${infoParam}`;

        try {
            // If there is a preview, send it in the request body
            let body = null;
            const headers: Record<string, string> = {};

            if (previewBlob) {
                headers['Content-Type'] = 'application/octet-stream';
                body = previewBlob;
            }

            const response = await send(url, {
                method: 'POST',
                headers,
                body
            }, true);

            if(response.status === 200) {
                return null;
            }

            if (response.status !== 206) {
                throw new Error(`Failed to initiate upload: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.id;
        } catch (error) {
            console.error("Failed to initiate upload:", error);
            throw error;
        }
    }


    public static async continueUpload(
        file: File,
        videoId: string,
        fingerprint: string,
        startPosition?: number,
        onProgress?: ProgressCallback
    ): Promise<string> {
        if(startPosition === undefined || startPosition === null) {
            startPosition = (await this.getVideo(videoId)).uploadSize as number;
        }

        let actualStartPosition = startPosition;

        const fileSlice = file.slice(actualStartPosition);
        const totalBytes = file.size;

        let uploadedBytes = actualStartPosition;
        const updateInterval = 1000;
        let lastUpdateTime = 0;

        const readableStream = new ReadableStream({
            async start(controller) {
                let position = actualStartPosition;
                onProgress?.({
                    bytesUploaded: uploadedBytes, totalBytes, percent: Math.round((uploadedBytes / totalBytes) * 100),
                    videoId, state: EUploadProgressState.Started });

                while (position < file.size) {
                    const end = Math.min(position + CHUNK_SIZE, file.size);
                    const chunk = file.slice(position, end);

                    const buffer = await chunk.arrayBuffer();
                    controller.enqueue(new Uint8Array(buffer));

                    const speedPerSecond = (end - position) / ((Date.now() - lastUpdateTime) / 1000);
                    position = end;
                    uploadedBytes = position;

                    const now = Date.now();
                    if (onProgress && now - lastUpdateTime > updateInterval) {
                        lastUpdateTime = now;
                        onProgress({
                            bytesUploaded: uploadedBytes,
                            totalBytes: totalBytes,
                            speed: speedPerSecond,
                            percent: Math.round((uploadedBytes / totalBytes) * 100),
                            videoId: videoId,
                            state: EUploadProgressState.Uploading
                        });
                    }
                    // throttle for test purposes
                    await new Promise(resolve => setTimeout(resolve, 777));
                }

                controller.close();
            }
        });

        const url = `${this.API_URL}/video/continueupload?id=${videoId}&from=${actualStartPosition}`;

        const response = await send(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
            },
            body: readableStream,
            // @ts-ignore
            duplex: 'half',
        }, true, true);

        if (!response.ok) {
            if (response.status === 409) {
                // Conflict - server specifies a different position
                const data = await response.json();
                // Repeat loading from the correct position
                return this.continueUpload(file, videoId, fingerprint, data.uploadSize, onProgress);
            }

            onProgress?.({ bytesUploaded: uploadedBytes, totalBytes: totalBytes, percent: 0, videoId, state: EUploadProgressState.Error });
            toast.open({ variant: ToastVariant.Error, body: `Failed to continue upload: ${response.statusText}` });
            throw new Error(`Failed to continue upload: ${response.status} ${response.statusText}`);
        }

        this.clearUploadState(fingerprint);
        onProgress?.({ bytesUploaded: totalBytes, totalBytes, percent: 100, videoId, state: EUploadProgressState.Completed });

        return videoId;
    }

    public static async getVideo(videoId: string) {
        const response = await fetcher.getJson(
            `${this.API_URL}/video/getbyid?id=${videoId}`, null, true
        );

        if (!response.ok) {
            toast.open({ variant: ToastVariant.Error, body: `Failed to get video: ${response.statusText}` });
        }

        return response.json();
    }

    /**
     * Save the download state to localStorage
     */
    public static saveUploadState(state: UploadState): void {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem(
                `${this.UPLOAD_STATE_PREFIX}${state.fingerprint}`,
                JSON.stringify(state)
            );
        } catch (e) {
            console.warn("Failed to save upload state:", e);
        }
    }

    public static updateUploadState(fingerprint: string, uploadedBytes: number): void {
        if (typeof window === 'undefined') return;

        try {
            const stateKey = `${this.UPLOAD_STATE_PREFIX}${fingerprint}`;
            const stateJson = localStorage.getItem(stateKey);
            if (!stateJson) return;

            const state = JSON.parse(stateJson);
            state.uploadedBytes = uploadedBytes;
            state.lastUpdated = Date.now();

            localStorage.setItem(stateKey, JSON.stringify(state));
        } catch (e) {
            console.warn("Failed to update upload state:", e);
        }
    }

    public static getSavedUploadState(fingerprint: string): UploadState | null {
        if (typeof window === 'undefined') return null;

        try {
            const stateKey = `${this.UPLOAD_STATE_PREFIX}${fingerprint}`;
            const stateJson = localStorage.getItem(stateKey);
            if (!stateJson) return null;

            const state = JSON.parse(stateJson);
            // Check if the state is out of date (7 days)
            const maxAge = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - state.lastUpdated > maxAge) {
                this.clearUploadState(fingerprint);
                return null;
            }

            return state;
        } catch (e) {
            console.warn("Failed to get upload state:", e);
            return null;
        }
    }

    public static clearUploadState(fingerprint: string): void {
        if (typeof window === 'undefined') return;

        try {
            localStorage.removeItem(`${this.UPLOAD_STATE_PREFIX}${fingerprint}`);
        } catch (e) {
            console.warn("Failed to clear upload state:", e);
        }
    }

    public static cleanupOldUploads(): void {
        if (typeof window === 'undefined') return;

        try {
            const maxAge = 7 * 24 * 60 * 60 * 1000;
            const now = Date.now();

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.UPLOAD_STATE_PREFIX)) {
                    const stateJson = localStorage.getItem(key);
                    if (stateJson) {
                        const state = JSON.parse(stateJson);
                        if (now - state.lastUpdated > maxAge) {
                            localStorage.removeItem(key);
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("Failed to cleanup old uploads:", e);
        }
    }
}

// Clear old downloads during service initialization
if (typeof window !== 'undefined') {
    VideoUploadService.cleanupOldUploads();
}