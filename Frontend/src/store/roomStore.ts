import {IUserSimpleDTO} from "@/shared/services/usersService";
import {create} from "zustand";
import {IParticipant} from "@/shared/services/echoHubService";

type TypeCurrentVideo = {
    id: string,
    title: string,
    onPage: boolean
}

export interface IRoomState {
    roomId: string | null;
    isRoomOwner: boolean;
    currentVideo?: TypeCurrentVideo;
    ownerId?: number; // Optional, if you want to track the owner
    participants: IParticipant[];
    setRoomId: (roomId: string | null) => void;
    setIsRoomOwner: (isOwner: boolean) => void;
    setParticipants: (participants: IParticipant[]) => void;
    setCurrentVideo: (video?: TypeCurrentVideo) => void;
    resetRoom: () => void;
}

export const useRoomStore = create<IRoomState>((set) => ({
        roomId: null,
        isRoomOwner: false,
        participants: [],

        setRoomId: (roomId: string | null) => set({ roomId }),
        setCurrentVideo: (video?: TypeCurrentVideo) => set({ currentVideo: video }),
        setIsRoomOwner: (isOwner: boolean) => set({ isRoomOwner: isOwner }),
        setParticipants: (participants: IParticipant[]) => set({ participants }),
        resetRoom: () => set({
            roomId: null,
            isRoomOwner: false,
            participants: []
        })
    })
);