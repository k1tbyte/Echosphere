import {EUserRole} from "@/types/user-role";
import fetcher, {send} from "@/shared/lib/fetcher";
import {queryToSearchParams, IQueryParams } from "@/shared/services/queryHelper";

export const enum EUserOnlineStatus {
    Offline = 0,
    Online = 1,
    InWatchParty = 2,
}

export interface IUserDTO {
    id: number;
    username: string;
    email: string;
    role: EUserRole;
    avatar?: string;
    joinedAt: string;
    onlineStatus?: EUserOnlineStatus;
}

export interface IUserSimpleDTO {
    id: number,
    username: string;
    avatar?: string | null;
    email?: string;
    role?: EUserRole;
    joinedAt?: string;
    onlineStatus?: EUserOnlineStatus;
}

export interface IUserFriendsDTO {
    friends?: IUserSimpleDTO[];
    sentRequests?: IUserSimpleDTO[];
    receivedRequests?: IUserSimpleDTO[];
}

export interface IFriendObject {
    user: IUserSimpleDTO;
    isFriend?: boolean;
    isSentRequest?: boolean;
    isReceivedRequest?: boolean;
}

export type IFriendObjectMap = Map<number, IFriendObject>;

let userAvatarUrl: string | null | undefined = undefined;

export class UsersService {
    public static async getUserById(userId: number): Promise<IUserDTO> {
        const result =  await fetcher.exceptJson<IUserDTO>(fetcher.getJson(
            process.env.NEXT_PUBLIC_API_URL + '/user/get/' + userId, null, true
        ));

        return result;
    }

    public static async uploadAvatar(file: File): Promise<Response> {
        return send(process.env.NEXT_PUBLIC_API_URL + '/user/uploadAvatar', {
                method: 'POST',
                body: await file.arrayBuffer(),
                headers: {
                    'Content-Type': 'application/octet-stream',
                }
            }, true
        );
    }

    public static async getUsers(query: IQueryParams) {
        const url = process.env.NEXT_PUBLIC_API_URL + '/user/getUsers';
        const params = queryToSearchParams(query);

        return await fetcher.exceptJson<IUserSimpleDTO[]>(
            fetcher.getJson(url + '?' + params.toString(), null, true)
        );
    }

    public static async getFriends(userId: number,
                                   includeSent: boolean = true,
                                   includeReceived: boolean = true,
                                   offset: number = 0,
                                   limit: number = 50) {
        const params = new URLSearchParams({
            userId: userId.toString(),
            includeSentRequests: includeSent.toString(),
            includeReceivedRequests: includeReceived.toString(),
            offset: offset.toString(),
            limit: limit.toString()
        });

        const result = await fetcher.exceptJson<IUserFriendsDTO>(
            fetcher.getJson(process.env.NEXT_PUBLIC_API_URL + '/user/getFriends?' + params.toString(), null, true)
        );

        const friendsMap = new Map<number, IFriendObject>();
        result.friends?.forEach(friend => {
            friendsMap.set(friend.id, {
                user: friend,
                isFriend: true
            });
        });
        result.sentRequests?.forEach(friend => {
            friendsMap.set(friend.id, {
                user: friend,
                isSentRequest: true
            });
        });
        result.receivedRequests?.forEach(friend => {
            friendsMap.set(friend.id, {
                user: friend,
                isReceivedRequest: true
            });
        });

        return {
            overall: friendsMap,
            friends: result.friends,
        }
    }

    public static async sendFriendship(fromId: number, toId: number): Promise<Response> {
        return fetcher.postJson(
            process.env.NEXT_PUBLIC_API_URL + '/user/sendFriendship', {
                userId: fromId,
                friendId: toId
            }, null, true
        );
    }

    public static async deleteFriendship(fromId: number, toId: number): Promise<Response> {
        return fetcher.postJson(
            process.env.NEXT_PUBLIC_API_URL + '/user/rejectFriendship', {
                userId: fromId,
                friendId: toId
            }, null, true
        );
    }

    public static async confirmFriendship(fromId: number, toId: number): Promise<Response> {
        return fetcher.postJson(
            process.env.NEXT_PUBLIC_API_URL + '/user/acceptFriendship', {
                userId: fromId,
                friendId: toId
            }, null, true
        );
    }

    public static async getPendingFriendships(userId: number): Promise<IUserSimpleDTO[]> {
        return fetcher.exceptJson<IUserSimpleDTO[]>(
            fetcher.getJson(
                process.env.NEXT_PUBLIC_API_URL + '/user/getPendingFriends?userId=' + userId, null, true
            )
        );
    }

    public static async updateUser(user: IUserDTO & { password?: string, oldPassword?: string }): Promise<Response> {
        return fetcher.patchJson(
            process.env.NEXT_PUBLIC_API_URL + '/user/update', user, null, true
        );
    }

    public static async deleteUser(userId: number): Promise<Response> {
        return send(
            process.env.NEXT_PUBLIC_API_URL + '/user/delete' + '?id=' + userId, {
                method: 'DELETE',
            }, true
        );
    }

    public static getUserAvatarUrl(user: IUserDTO | IUserSimpleDTO, withFallback: boolean = false): string | null {
        if (user.avatar) {
            return process.env.NEXT_PUBLIC_API_URL + '/user/avatar?userId=' + user.id;
        }
        if(withFallback) {
            return `https://ui-avatars.com/api/?name=${user.username}.svg`;
        }

        return null;
    }

    public static getFallbackAvatarUrl(username: string): string {
        return `https://ui-avatars.com/api/?name=${username}.svg`;
    }

    public static getLocalUserAvatarUrl(): string | null {
        if(userAvatarUrl !== undefined) {
            return userAvatarUrl;
        }
        userAvatarUrl = localStorage.getItem(`user-avatar`);
        return userAvatarUrl;
    }

    public static storeUserAvatarUrl(user: IUserDTO): void {
        userAvatarUrl = this.getUserAvatarUrl(user);

        if (userAvatarUrl) {
            localStorage.setItem(`user-avatar`, userAvatarUrl);
        } else {
            localStorage.removeItem(`user-avatar`);
        }
    }
}