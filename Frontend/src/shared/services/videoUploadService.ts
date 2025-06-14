import {toast, ToastVariant} from '../ui/Toast';
import fetcher, {API_URL, send} from "@/shared/lib/fetcher";
import {IVideoPropsSchema} from "@/store/videoStore";
import {toBase64} from "@/shared/lib/utils";
import {IVideoSettingsDTO} from "@/shared/services/videosService";
import {getSession} from "next-auth/react";

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
    isPublic?: boolean;
    settings?: IVideoSettingsDTO;
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
    public static readonly OnUploadProgress = new Map<string, ProgressCallback>();

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
        const infoParam = encodeURIComponent(toBase64(JSON.stringify(metadata)));

        const url = `${API_URL}/video/initiateupload?info=${infoParam}`;

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

            if(response.status === 200 || response.status === 204) {
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

        const actualStartPosition = startPosition ?? 0;
        const fileSlice = file.slice(actualStartPosition);
        const totalBytes = file.size;

        const token = (await getSession()).accessToken

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const url = `${API_URL}/video/continueupload?id=${videoId}&from=${actualStartPosition}`;

            const onProgressChanged = (progress: UploadProgress) => {
                onProgress?.(progress);
                console.log(`Upload progress: ${progress.percent}% (${progress.bytesUploaded}/${progress.totalBytes} bytes)`, videoId);

                if(this.OnUploadProgress.has(videoId)) {
                    this.OnUploadProgress.get(videoId)!(progress);
                }
            }

            xhr.open('POST', url);
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const uploadedBytes = actualStartPosition + event.loaded;
                    const percent = Math.round((uploadedBytes / totalBytes) * 100);
                    const progress = {
                        bytesUploaded: uploadedBytes,
                        totalBytes,
                        percent,
                        videoId,
                        // @ts-ignore
                        speed: event.loaded / ((Date.now() - xhr.timeStart) / 1000),
                        state: EUploadProgressState.Uploading
                    };

                    onProgressChanged(progress);
                }
            });

            // Начало загрузки
            xhr.upload.addEventListener('loadstart', () => {
                // @ts-ignore
                xhr.timeStart = Date.now();
                const progress = {
                    bytesUploaded: actualStartPosition,
                    totalBytes,
                    percent: Math.round((actualStartPosition / totalBytes) * 100),
                    videoId,
                    state: EUploadProgressState.Started
                };
                onProgressChanged(progress);
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    this.clearUploadState(fingerprint);
                    const progress = {
                        bytesUploaded: totalBytes,
                        totalBytes,
                        percent: 100,
                        videoId,
                        state: EUploadProgressState.Completed
                    };
                    onProgressChanged(progress);

                    resolve(videoId);
                } else if (xhr.status === 409) {
                    // Conflict - server specifies a different position
                    const data = JSON.parse(xhr.responseText);
                    // Repeat loading from the correct position
                    this.continueUpload(file, videoId, fingerprint, data.uploadSize, onProgress)
                        .then(resolve)
                        .catch(reject);
                } else {
                    const progress = {
                        bytesUploaded: actualStartPosition,
                        totalBytes,
                        percent: 0,
                        videoId,
                        state: EUploadProgressState.Error
                    };

                    onProgressChanged(progress);

                    toast.open({ variant: ToastVariant.Error, body: `Failed to continue upload: ${xhr.statusText}` });
                    reject(new Error(`Failed to continue upload: ${xhr.status} ${xhr.statusText}`));
                }
            });

            xhr.addEventListener('error', () => {
                const progress = {
                    bytesUploaded: actualStartPosition,
                    totalBytes,
                    percent: 0,
                    videoId,
                    state: EUploadProgressState.Error
                };

                onProgressChanged(progress);

                toast.open({ variant: ToastVariant.Error, body: 'Network error occurred during upload' });
                reject(new Error('Network error occurred during upload'));
            });

            // Отправка файла
            xhr.send(fileSlice);
        });
    }

/*
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

        const actualStartPosition = startPosition;
        const totalBytes = file.size;
        let uploadedBytes = actualStartPosition;
        let position = actualStartPosition;

        onProgress?.({
            bytesUploaded: uploadedBytes,
            totalBytes,
            percent: Math.round((uploadedBytes / totalBytes) * 100),
            videoId,
            state: EUploadProgressState.Started
        });

        while (position < file.size) {
            const end = Math.min(position + CHUNK_SIZE, file.size);
            const chunk = file.slice(position, end);

            const url = `${API_URL}/video/continueupload?id=${videoId}&from=${position}`;

            try {
                const response = await send(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                    },
                    body: chunk,
                }, true, true);

                if (!response.ok) {
                    if (response.status === 409) {
                        const data = await response.json();
                        return this.continueUpload(file, videoId, fingerprint, data.uploadSize, onProgress);
                    }
                    throw new Error(`Failed to continue upload: ${response.status} ${response.statusText}`);
                }

                position = end;
                uploadedBytes = position;

                onProgress?.({
                    bytesUploaded: uploadedBytes,
                    totalBytes,
                    percent: Math.round((uploadedBytes / totalBytes) * 100),
                    videoId,
                    state: EUploadProgressState.Uploading
                });

            } catch (error) {
                onProgress?.({
                    bytesUploaded: uploadedBytes,
                    totalBytes,
                    percent: 0,
                    videoId,
                    state: EUploadProgressState.Error
                });
                toast.open({
                    variant: ToastVariant.Error,
                    // @ts-ignore
                    body: `Failed to continue upload: ${error.message}`
                });
                throw error;
            }
        }

        this.clearUploadState(fingerprint);
        onProgress?.({
            bytesUploaded: totalBytes,
            totalBytes,
            percent: 100,
            videoId,
            state: EUploadProgressState.Completed
        });

        return videoId;
    }
*/

    public static async getVideo(videoId: string) {
        const response = await fetcher.getJson(
            `${API_URL}/video/getVideo?id=${videoId}`, null, true
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

    public static async getVideoSettingsSchema(): Promise<IVideoPropsSchema> {
        const response = fetcher.getJson(
            `${API_URL}/video/settingsschema`, null, true
        );
        return await fetcher.exceptJson<IVideoPropsSchema>(response);
    }
}

// Clear old downloads during service initialization
if (typeof window !== 'undefined') {
    VideoUploadService.cleanupOldUploads();
}