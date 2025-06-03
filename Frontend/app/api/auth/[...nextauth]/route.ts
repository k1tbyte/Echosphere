import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import {decodeJwt} from "jose";
import fetcher from '@/shared/lib/fetcher';
import {EUserRole} from "@/types/user-role";
import {auth} from "@/shared/services/authService";
import { JWT } from 'next-auth/jwt';

type RefreshSession = { accessToken: string, refreshToken: string };
const refreshingUsers = new Map<number, Promise<RefreshSession> | null>();

const getSessionPayload = (newSession: RefreshSession) => {
    const jwt = decodeJwt(newSession.accessToken);
    return {
        id: jwt.userid as string,
        username: jwt.display_name as string,
        apiAccessToken: newSession.accessToken,
        apiRefreshToken: newSession.refreshToken,
        role: Number(jwt.access_role) as EUserRole,
        avatar: jwt.avatar as string,
        email: jwt.email as string,
        accessExp: jwt.exp as number,
    } as JWT;
}

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

                let response;
                try {
                    response = await auth.login(credentials.email, credentials.password, true);
                } catch (error: any) {
                    if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNRESET') {
                        throw new Error("server_unavailable");
                    }
                    console.error("Error during login:", error);
                    throw new Error(error.message);
                }


                const data = await response.json();

                if (!data.accessToken) {
                    console.error("No access token in response");
                    return null;
                }

                return getSessionPayload({
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                });
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

                return getSessionPayload({
                    accessToken: credentials.accessToken,
                    refreshToken: credentials.refreshToken,
                });
            },
        }),
    ],
    pages: {
        signIn: '/auth',
/*        signOut: '/auth'*/
    /*    error: '/auth/error'*/
    },
    events: {
        async signOut({ session, token}) {
            await auth.logout(token.apiRefreshToken, token.apiAccessToken!);
        }
    },
    callbacks: {
        async jwt({ token, user, account }) {
            if(token && token.accessExp && (token.accessExp - 10) < (Date.now() / 1000)) {

                const idNumber = Number(token.id);
                try {
                    let refreshPromise: Promise<RefreshSession>;
                    if(refreshingUsers.has(idNumber)) {
                        console.log("User is already being refreshed", idNumber);
                        refreshPromise = refreshingUsers.get(idNumber)!;
                    } else {
                        console.log("Refreshing user with token", token.refreshToken, token.accessExp, Date.now() / 1000);
                        refreshPromise =  auth.refreshSession(token.apiRefreshToken, token.apiAccessToken)
                    }

                    let data = await refreshPromise;
                    return getSessionPayload(data)
                } finally {
                    refreshingUsers.delete(idNumber)
                }
            }

            if (user) {
                // @ts-ignore
                return {...token, ...user,};
            }

            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.role = token.role as EUserRole;
                session.user.username = token.username as string;
                session.user.email = token.email as string;
                session.user.id = token.id as string;
                session.accessToken = token.apiAccessToken!;
                session.refreshToken = token.apiRefreshToken!;
            }

            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
    jwt: {
        maxAge: 60 * 60 * 24 * 30
    },
    session: {
        strategy: 'jwt',
        maxAge: 60 * 60 * 24 * 30,
    },
    debug: process.env.NODE_ENV !== 'production',
});

export { handler as GET, handler as POST };