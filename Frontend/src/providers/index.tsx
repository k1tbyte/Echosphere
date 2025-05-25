"use client";

import {SessionProvider} from "next-auth/react";
import {ThemeProvider} from "@/providers/ThemeProvider";

export const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        <SessionProvider refetchInterval={30}>
            <ThemeProvider>
                {children}
            </ThemeProvider>
        </SessionProvider>
    );
}