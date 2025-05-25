import 'next-auth';
import 'next-auth/jwt';
import {EUserRole} from "@/types/user-role";

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            name: string;
            email: string;
            avatar: string;
            role: EUserRole;
        };
        accessToken: string;
        error?: string;
    }

    interface User {
        id: string;
        name: string;
        avatar: string;
        accessToken: string;
        refreshToken: string;
        // Другие поля пользователя
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        accessToken: string;
        refreshToken: string;
        avatar?: string;
        error?: string;
        accessExp: number;
        // Другие поля JWT
    }
}