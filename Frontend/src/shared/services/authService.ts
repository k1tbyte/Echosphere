import { getSession, signOut } from "next-auth/react";

import fetcher  from "@/shared/lib/fetcher"

const url = process.env.NEXT_PUBLIC_API_URL;

export const auth = {
    login: async (email: string, password: string, remember: boolean) => {
        return await fetcher.postJson(url + '/auth/login', { email, password, remember },
            {
                cache: 'no-store',
            }
        );
    },
    logout: async (refreshToken: string, accessToken: string) => {
        const session = await getSession();
        return await fetcher.postJson(url + '/auth/logout', { refreshToken },
            {
                cache: 'no-store',
                headers: {
                    Authorization: `Bearer ${session?.accessToken ?? accessToken}`
                }
            }
        );
    },
    refreshSession: async (refreshToken: string, accessToken: string) => {
        const response = await fetcher.postJson(url + '/auth/refreshSession', { refreshToken, accessToken });

        return (await response.json()) as {
            accessToken: string;
            refreshToken: string;
        }
    },
    signup: async (username: string, email: string, password: string) => {
        let response = await fetcher.postJson(url + '/auth/signup', {  username, email, password });

        const token = (await response.json()).confirmationToken;

        if(!token) {
            throw new Error('Token not found');
        }

        await fetcher.postJson('/api/auth/send-confirmation', { email, token });
    },
    confirmEmail: async (token: string) => {
        const response = await fetcher.postJson(url + '/auth/confirmEmail', { token });

        return (await response.json()) as {
            refreshToken: string;
            accessToken: string;
            email: string;
        }
    }
}