import fetcher  from "@/shared/lib/fetcher"

const url = process.env.NEXT_PUBLIC_API_URL;

export const auth = {
    login: async (email: string, password: string) => {
        return await fetcher.postJson(url + '/auth/login', { email, password });
    },
    logout: async () => {
        return await fetcher.postJson(url + '/auth/logout', {});
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