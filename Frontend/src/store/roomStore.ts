import {IUserSimpleDTO} from "@/shared/services/usersService";
import {create} from "zustand";

export interface IRoomState {
    roomId: string | null;
    isRoomOwner: boolean;
    ownerId?: number; // Optional, if you want to track the owner
    users: Map<number, IUserSimpleDTO>;
    setRoomId: (roomId: string | null) => void;
    setIsRoomOwner: (isOwner: boolean) => void;
    setOwnerId: (ownerId: number) => void;
    setUsers: (users: IUserSimpleDTO[]) => void;
    resetRoom: () => void;
}

export const useRoomStore = create<IRoomState>((set) => ({
        roomId: null,
        isRoomOwner: false,
        ownerId: undefined,
        users: new Map<number, IUserSimpleDTO>(),

        setRoomId: (roomId: string | null) => set({ roomId }),
        setIsRoomOwner: (isOwner: boolean) => set({ isRoomOwner: isOwner }),
        setOwnerId: (ownerId: number) => set({ ownerId }),
        setUsers: (users: IUserSimpleDTO[]) => {
            const userMap = new Map<number, IUserSimpleDTO>();
            users.forEach(user => userMap.set(user.id, user));
            set({ users: userMap });
        },
        resetRoom: () => set({
            roomId: null,
            isRoomOwner: false,
            ownerId: undefined,
            users: new Map<number, IUserSimpleDTO>()
        })
    })
);