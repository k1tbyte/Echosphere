import React, {FC} from "react";
import {TopNavbar} from "@/widgets/TopNavbar";
import Sidebar from "@/widgets/sidebar/Sidebar";

interface IMainLayoutProps {
    isAuthenticated: boolean;
    children: React.ReactNode;
}

export const MainLayout: FC<IMainLayoutProps> = ({ children, isAuthenticated }) => {

    if(!isAuthenticated) {
        return children;
    }

    return (
        <div className="flex h-svh p-2 gap-3">
            <Sidebar className="h-full" />
            <div className="flex w-full flex-col gap-3">
                <TopNavbar />
                <main className="bg-background/75 border-border border rounded-sm flex-1 overflow-auto p-4">
                    {children}
                </main>
            </div>
        </div>
    )
}