import fetcher from "@/shared/lib/fetcher";

export const enum EVideoProvider {
    Local = 0,
    YouTube = 1,
    Vimeo = 2
}

export const enum EVideoStatus {
    Failed = 0,
    Pending,
    Queued,
    Processing,
    Ready,
    Blocked
}

export interface IVideoQualityDTO {
    height: number;
    videoBitrate: number;
    audioBitrate?: number;
}

export interface IVideoSettingsDTO {
    thumbnailsCaptureInterval: number;
    adaptive?:{
        qualities: IVideoQualityDTO[];
        video: {
            codec: string;
            preset: string;
        },
        audio: {
            codec: string;
            bitrate: number;
        }
    }
}


export interface IQueryParams {
    offset: number;
    limit: number;
    filter?: string;
    descending?: boolean;
    orderBy?: string;
}

export interface IVideoObject {
    title: string;
    duration?: number;
    id: string;
    ownerId: number;
    settings?: IVideoSettingsDTO;
    videoUrl?: string;
    status: EVideoStatus;
    provider: EVideoProvider;
    description?: string;
    previewUrl?: string;
    createdAt: string;
    uploadedAt?: string;
    isPublic: boolean;
    uploadSize?: number;
    size?: number;
}

export class VideosService {

    public static async getVideos(query: IQueryParams): Promise<IVideoObject[]> {
        const url = process.env.NEXT_PUBLIC_API_URL + '/video/getUserVideos';
        console.log("Order by:", query.orderBy, "Descending:", query.descending, "Filter:", query.filter);
        const params = new URLSearchParams({
            offset: query.offset.toString(),
            limit: query.limit.toString()
        });

        if (query.filter) {
            params.append('filter', query.filter);
        }
        if (query.descending !== undefined) {
            params.append('desc', query.descending.toString());
        }
        if (query.orderBy) {
            params.append('sortBy', query.orderBy);
        }

        const result =  await fetcher.exceptJson<IVideoObject[]>(
            fetcher.getJson(url + '?' + params.toString(), null, true)
        );
        for (const video of result) {
            if (video.settings) {
                video.settings = JSON.parse(video.settings as unknown as string);
            }
        }

        return result;
    }

    public static getVideoPreviewUrl(video: IVideoObject) {
        if (video.previewUrl) {
            return video.previewUrl;
        }
        return process.env.NEXT_PUBLIC_API_URL + `/video/resource/${video.id}/preview`;
    }
}