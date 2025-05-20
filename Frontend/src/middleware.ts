import { NextResponse } from "next/server";
import { NextRequestWithAuth, withAuth } from "next-auth/middleware";
import { EUserRole } from "@/types/user-role";

function redirectToAuth(request: NextRequestWithAuth) {
    const url = request.nextUrl.clone();
    const callbackUrl = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = "/auth";

    if (callbackUrl && callbackUrl !== '/') {
        url.searchParams.set("callbackUrl", encodeURIComponent(callbackUrl));
    }

    return NextResponse.redirect(url);
}

export default withAuth(
    function middleware(request: NextRequestWithAuth) {
        const { pathname } = request.nextUrl;
        const { token } = request.nextauth;

        if (!token) {
            if (pathname.startsWith("/auth") || pathname.startsWith("/api/auth")) {
                return NextResponse.next();
            }

            return redirectToAuth(request);
        }

        if (token && pathname.startsWith("/auth")) {
            const url = request.nextUrl.clone();
            const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");

            if (callbackUrl) {
                url.pathname = decodeURIComponent(callbackUrl);
                url.searchParams.delete("callbackUrl");
            } else {
                url.pathname = "/";
            }

            return NextResponse.redirect(url);
        }

        if (pathname.startsWith("/admin")) {
            const userRole = token.role as EUserRole;

            if (userRole !== EUserRole.Admin) {
                // Если нет доступа, перенаправляем на главную
                const url = request.nextUrl.clone();
                url.pathname = "/";
                return NextResponse.redirect(url);
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => {
                return true;
            },
        },
    },
);


export const config = {
    matcher: [
        /*
         * Match all paths except for:
         * 1. /api routes that don't start with /api/auth
         * 2. /_next (Next.js internals)
         * 3. /fonts, /icons, /images (static resources)
         * 4. /favicon.ico, /sitemap.xml (SEO files)
         */
        '/((?!api/auth|_next/static|_next/image|fonts|icons|images|favicon.ico).*)',
    ],
};