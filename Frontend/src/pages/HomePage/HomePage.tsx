"use client"

import {Sidebar, SidebarItem } from "./ui/Sidebar";
import {TopNavbar} from "./ui/TopNavbar";
import {Loader} from "@/shared/ui/Loader";
import {Spinner} from "@/shared/ui/Loader/Loader";
import {Button} from "@/shared/ui/Button";
import {modal} from "@/shared/ui/Modal";
import {Tab, TabPanel, TabTitle} from "@/shared/ui/Tabs";

export const HomePage = () => {
    return (
        <div className="flex h-screen p-2 gap-3">
            <Sidebar className="h-full" />

            <div className="flex w-full flex-col gap-3">
                <TopNavbar />
                <main className="bg-background/75 border-border border rounded-sm h-full">
{/*                    <TabPanel className="mt-3"
                              activeKey="profile">
                        <Tab key="profile" title={<TabTitle>Profile</TabTitle>} children={"Content first"}/>
                        <Tab key="settings" title={<TabTitle>Settings</TabTitle>} children={
                            <div className="flex items-center justify-center h-full">
                                <Loader variant="wave" size="md" className="h-10 w-10"/>
                            </div>
                        }/>
                        <Tab key="messages" title={<TabTitle>Messages</TabTitle>} children={
                            <div className="flex items-center justify-center h-full">
                                <Spinner className="h-10 w-10"/>
                            </div>
                        }/>
                    </TabPanel>*/}
                </main>
            </div>
        </div>
    )
}