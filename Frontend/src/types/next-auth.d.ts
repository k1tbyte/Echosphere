import 'next-auth';
import 'next-auth/jwt';
import {EUserRole} from "@/types/user-role";

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            username: string;
            email: string;
            avatar: string;
            role: EUserRole;
        };
        accessToken: string;
        refreshToken: string;
        error?: string;
    }

    interface User {
        id: string;
        username: string;
        apiAccessToken: string;
        apiRefreshToken: string;
        role: EUserRole;
        avatar?: string;
        error?: string;
        accessExp: number;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        username: string;
        apiAccessToken: string;
        apiRefreshToken: string;
        role: EUserRole;
        avatar?: string;
        error?: string;
        accessExp: number;
    }
}