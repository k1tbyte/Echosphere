"use client";

import React from 'react';
import { Tab, TabPanel } from "@/shared/ui/Tabs";
import { useRouter, useSearchParams } from 'next/navigation';
import { UsersTab } from './UsersTab';
import { ServerTab } from './ServerTab';
import {useTitle} from "@/widgets/player/hooks/useTitle";

export const AdminPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = searchParams?.get('tab') || 'users';
    useTitle("Admin")

    const handleTabChange = (tab: React.Key) => {
        router.push(`/admin?tab=${tab}`);
    };

    return (
        <div className="p-4 h-full">
            <TabPanel
                activeKey={activeTab}
                onTabChange={handleTabChange}
                className="w-full"
            >
                <Tab
                    key="users"
                    title="Users Management"
                >
                    <UsersTab />
                </Tab>
                <Tab
                    key="server"
                    title="Server Settings"
                >
                    <ServerTab />
                </Tab>
            </TabPanel>
        </div>
    );
};