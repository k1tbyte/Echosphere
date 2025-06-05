import {IUserSimpleDTO} from "@/shared/services/usersService";
import {create} from "zustand";

export interface IRoomState {
    roomId: string | null;
    isRoomOwner: boolean;
    ownerId?: number; // Optional, if you want to track the owner
    users: Map<number, IUserSimpleDTO>;
    setRoomId: (roomId: string | null) => void;
    setIsRoomOwner: (isOwner: boolean) => void;
    setUsers: (users: IUserSimpleDTO[]) => void;
    resetRoom: () => void;
}

export const useRoomStore = create<IRoomState>((set) => ({
        roomId: null,
        isRoomOwner: false,
        users: new Map<number, IUserSimpleDTO>(),

        setRoomId: (roomId: string | null) => set({ roomId }),
        setIsRoomOwner: (isOwner: boolean) => set({ isRoomOwner: isOwner }),
        setUsers: (users: IUserSimpleDTO[]) => {
            const userMap = new Map<number, IUserSimpleDTO>();
            users.forEach(user => userMap.set(user.id, user));
            set({ users: userMap });
        },
        resetRoom: () => set({
            roomId: null,
            isRoomOwner: false,
            users: new Map<number, IUserSimpleDTO>()
        })
    })
);