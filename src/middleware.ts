import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const AUTH_PAGES = ["/sign-in", "/sign-up", "/verify"];

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request });
    const url = request.nextUrl;

    if (token) {
        // If user is already logged in, prevent access to auth pages and the landing page
        if (AUTH_PAGES.includes(url.pathname) || url.pathname === "/") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
    } else {
        // Allow logged-out users on the landing + auth pages
        if (AUTH_PAGES.includes(url.pathname) || url.pathname === "/") {
            return NextResponse.next();
        }

        // Everything else (dashboard etc.) requires a session
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/sign-in", "/sign-up", "/", "/verify/:path*", "/dashboard/:path*"]
};
