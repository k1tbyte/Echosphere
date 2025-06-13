import fetcher, {API_URL, IMAGES_URL, send} from "@/shared/lib/fetcher";
import {IQueryParams, queryToSearchParams} from "@/shared/services/queryHelper";
import {IUserSimpleDTO} from "@/shared/services/usersService";

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
    ownerSimplified?: IUserSimpleDTO;
}

export class VideosService {

    public static async getUserVideos(query: IQueryParams): Promise<IVideoObject[]> {
        const url = API_URL + '/video/getUserVideos';
        const params = queryToSearchParams(query)

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

    public static async getPublicVideos(query: IQueryParams & { includeOwner?: boolean }): Promise<IVideoObject[]> {
        const url = API_URL + '/video/getVideos';
        const params = queryToSearchParams(query)
        if(query.includeOwner !== undefined) {
            params.append('includeOwner', query.includeOwner.toString());
        }
        const result = await fetcher.exceptJson<IVideoObject[]>(
            fetcher.getJson(url + '?' + params.toString(), null, true)
        );
        for (const video of result) {
            if (video.settings) {
                video.settings = JSON.parse(video.settings as unknown as string);
            }
        }
        return result;
    }


    public static async deleteVideo(videoId: string): Promise<Response> {
        return await send(
            API_URL + '/video/delete?id=' + videoId,
            {
                method: 'DELETE',
            },
            true
        );
    }

    public static async getVideoById(videoId: string, includeOwner: boolean = true): Promise<IVideoObject> {
        const url = API_URL + '/video/getVideo?id=' + videoId + (includeOwner ? '&includeOwner=true' : '');
        const video = await fetcher.exceptJson<IVideoObject>(
            fetcher.getJson(url, null, true)
        );
        if (video.settings) {
            video.settings = JSON.parse(video.settings as unknown as string);
        }
        return video;
    }

    public static getVideoPreviewUrl(video: IVideoObject) {
        if (video.previewUrl) {
            return video.previewUrl;
        }
        return IMAGES_URL + `/video/resource/${video.id}/preview`;
    }
}