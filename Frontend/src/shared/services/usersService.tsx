import {EUserRole} from "@/types/user-role";
import fetcher, {send} from "@/shared/lib/fetcher";

export interface IUserDTO {
    id: number;
    username: string;
    email: string;
    role: EUserRole;
    avatar?: string;
    joinedAt: string;
}

let userAvatarUrl: string | null | undefined = undefined;

export class UsersService {
    public static async getUserById(userId: number): Promise<IUserDTO> {
        return await fetcher.exceptJson<IUserDTO>(fetcher.getJson(
            process.env.NEXT_PUBLIC_API_URL + '/user/get/' + userId, null, true
        ));
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

    public static async updateUser(user: IUserDTO & { password?: string, oldPassword?: string }): Promise<Response> {
        return fetcher.patchJson(
            process.env.NEXT_PUBLIC_API_URL + '/user/update', user, null, true
        );
    }

    public static getUserAvatarUrl(user: IUserDTO): string | null {
        if (user.avatar) {
            return process.env.NEXT_PUBLIC_API_URL + '/user/avatar?userId=' + user.id;
        }

        return null;
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