import { create } from 'zustand';
import {EUserRole} from "@/types/user-role";

export enum EVideoCodecProvider {
    None,
    NVIDIA,
    IntelQuickSync,
    AMD,
    VAAPILinux,
    WindowsMediaFoundation,
    AppleVideoToolbox
}

export interface IVideoCodecPreset {
    description: string;
    isDefault?: boolean;
    qualityFactor: number;
    speedFactor: number;
}

export interface IVideoCodec {
    bitrateMultiplier: number;
    description: string;
    enabledFromRole: EUserRole;
    hasHardwareAcceleration: boolean;
    name: string;
    presets: string;
    provider: number;
}

export interface IVideoBitrate {
    audioBitrate: number;
    minBitrate: number;
    maxBitrate: number;
    optimalBitrate: number;
}

export interface IVideoPropsSchema {
    thumbnailsCaptureInterval: { min: number, max: number, default: number };
    audioCodecs: Record<string, number>[]
    videoBitrates: Record<string, IVideoBitrate>;
    audioBitrates: Record<string, number>[];
    defaultAudioBitrate: number;
    codecs: IVideoCodec[];
    codecPresets: Record<string, Record<string, IVideoCodecPreset>[]>[];
}



export interface VideosStore {
    schema?: IVideoPropsSchema | null;
    setSchema: (schema: IVideoPropsSchema) => void;
}

// @ts-ignore
export const useVideosStore = create<VideosStore>((set) => ({
    schema: undefined,

    setSchema: (schema: IVideoPropsSchema) => set({ schema }),
}));