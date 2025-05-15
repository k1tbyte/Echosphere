"use client"

import {Sidebar, SidebarItem } from "./ui/Sidebar";
import {TopNavbar} from "./ui/TopNavbar";

export const HomePage = () => {
    return (
        <div className="flex h-screen p-2 gap-3">
            <Sidebar className="h-full" />

            <div className="flex w-full flex-col gap-3">
                <TopNavbar />
                <main className="bg-background/75 border-border border rounded-sm h-full">
                    Main
                </main>
            </div>
        </div>
    )
}