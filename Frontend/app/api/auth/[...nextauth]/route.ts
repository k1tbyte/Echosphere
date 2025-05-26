import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import {decodeJwt} from "jose";
import fetcher from '@/shared/lib/fetcher';
import {EUserRole} from "@/types/user-role";
import {auth} from "@/shared/services/authService";

type RefreshSession = { accessToken: string, refreshToken: string };
const refreshingUsers = new Map<number, Promise<RefreshSession> | null>();

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

                const jwt = decodeJwt(data.accessToken);

                return {
                    id: jwt.userid as string,
                    name: jwt.display_name as string,
                    avatar: jwt.avatar as string,
                    email: jwt.email as string,
                    accessExp: jwt.exp as number,
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
/*        signOut: '/auth'*/
    /*    error: '/auth/error'*/
    },
    events: {
        async signOut({ session, token}) {
            await auth.logout(token.refreshToken, token.accessToken!);
        }
    },
    callbacks: {
        async jwt({ token, user, account }) {
            if(token && token.accessExp && (token.accessExp - 10) < (Date.now() / 1000)) {

                console.log(token.id);
                const idNumber = Number(token.id);
                try {
                    let refreshPromise: Promise<RefreshSession>;
                    if(refreshingUsers.has(idNumber)) {
                        console.log("User is already being refreshed", idNumber);
                        refreshPromise = refreshingUsers.get(idNumber)!;
                    } else {
                        refreshPromise =  auth.refreshSession(token.refreshToken, token.accessToken)
                    }

                    let data = await refreshPromise;

                    return {
                        ...token,
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                    }
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
                session.user.role = token.access_role as EUserRole;
                session.user.id = token.id as string;
                session.user.avatar = token.avatar as string;
                session.accessToken = token.accessToken!;
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