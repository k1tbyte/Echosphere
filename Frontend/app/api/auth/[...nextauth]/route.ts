import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import {decodeJwt} from "jose";
import fetcher from '@/shared/lib/fetcher';
import {EUserRole} from "@/types/user-role";


const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { },
                password: { },
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) {
                    console.log("Missing email or password");
                    return null;
                }

                const response = await fetcher.postJson(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
                    email: credentials.email,
                    password: credentials.password,
                    remember: true
                },{ cache: 'no-store' }).catch(error => {
                    if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNRESET') {
                        throw new Error("server_unavailable");
                    }
                    throw new Error(error.message);
                });

                const data = await response.json();

                if (!data.accessToken) {
                    console.error("No access token in response");
                    return null;
                }

                const jwt = decodeJwt(data.accessToken);

                return {
                    id: jwt.userid as string,
                    name: jwt.display_name as string,
                    avatar: jwt.avatar as string,
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                };
            }
        }),
        CredentialsProvider({
            id: "token-auth",
            name: "Token Authentication",
            credentials: {
                accessToken: {  },
                refreshToken: { },
            },
            async authorize(credentials) {
                if (!credentials?.accessToken || !credentials?.refreshToken) {
                    return null;
                }

                const jwt = decodeJwt(credentials.accessToken);

                return {
                    id: jwt.userid as string,
                    name: jwt.display_name as string,
                    avatar: jwt.avatar as string,
                    accessToken: credentials.accessToken,
                    refreshToken: credentials.refreshToken,
                };
            },
        }),
    ],
    pages: {
        signIn: '/auth',
    /*    error: '/auth/error'*/
    },
    callbacks: {
        async jwt({ token, user, account }) {

            if (user) {
                // @ts-ignore
                return {...token, ...user,};
            }

            return token;
        },
        async session({ session, token }) {

            if (session.user) {
                session.user.role = token.role as EUserRole; // Ensure role is assigned from token
                session.user.id = token.id as string;
                session.user.avatar = token.avatar as string;
            }
            session.accessToken = token.accessToken!;

            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
    jwt: {
        maxAge: 60 * 60 * 24 * 30, // 30 дней
    },
    session: {
        strategy: 'jwt',
        maxAge: 60 * 60 * 24 * 30, // 30 дней
    },
    debug: process.env.NODE_ENV !== 'production',
});

export { handler as GET, handler as POST };