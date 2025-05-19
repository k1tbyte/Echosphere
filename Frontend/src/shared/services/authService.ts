import fetcher  from "@/shared/lib/fetcher"

const url = process.env.NEXT_PUBLIC_BACKEND_URL;

export const auth = {
    login: async (email: string, password: string) => {
        return await fetcher.postJson(url + '/api/v2/auth/login', { email, password });
    },
    logout: async () => {
        return await fetcher.postJson(url + '/api/v2/auth/logout', {});
    },
    signup: async (username: string, email: string, password: string) => {
        let response = await fetcher.postJson(url + '/api/v2/auth/signup', {  username, email, password });

        const token = (await response.json()).confirmationToken;

        if(!token) {
            throw new Error('Token not found');
        }

        await fetcher.postJson('/api/send-confirmation', { email, token });
    },
    confirmEmail: async (token: string) => {
        const response = await fetcher.postJson(url + '/api/v2/auth/confirmEmail', { token });

        return (await response.json()) as {
            refreshToken: string;
            accessToken: string;
            email: string;
        }
    }
}