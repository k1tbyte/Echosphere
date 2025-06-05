"use client";

import {SessionProvider} from "next-auth/react";
import {ThemeProvider} from "@/providers/ThemeProvider";
import {EchoProvider} from "@/providers/EchoProvider";

export const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        <SessionProvider refetchInterval={30}>
            <EchoProvider>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </EchoProvider>
        </SessionProvider>
    );
}