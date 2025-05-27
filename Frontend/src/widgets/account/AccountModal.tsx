"use client";

import {FC, useEffect, useState} from "react";
import {Button} from "@/shared/ui/Button";
import {modal, ModalSeparator, useModalActions} from "@/shared/ui/Modal";
import {useSession} from "next-auth/react";
import Image from "next/image";
import {Plus, Lock, Users, User, Save} from "lucide-react";
import {Label} from "@/shared/ui/Label";
import {Separator} from "@/shared/ui/Separator";
import {Loader} from "@/shared/ui/Loader";
import {toast, ToastVariant} from "@/shared/ui/Toast";
import {Tab, TabPanel, TabTitle} from "@/shared/ui/Tabs";
import {Input} from "@/shared/ui/Input";

export const AccountModal: FC = () => {
    const { data: session, status } = useSession();
    const { contentRef, closeModal } = useModalActions<HTMLDivElement>();
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState<string>("");
    const [currentPassword, setCurrentPassword] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [activeTab, setActiveTab] = useState<string>("profile");

    const handleUploadAvatar = () => {
        toast.open({
            body: "Avatar upload functionality will be available in an upcoming update!",
            variant: ToastVariant.Info
        });
    };

    const handleSaveProfile = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            toast.open({
                body: "Profile successfully updated!",
                variant: ToastVariant.Success
            });
        }, 1000);
    };

    const handleChangePassword = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            toast.open({
                body: "Password successfully changed!",
                variant: ToastVariant.Success
            });
        }, 1000);
    };

    // Set initial username value from session
    useEffect(() => {
        if (session?.user.username) {
            setUsername(session.user.username);
        }
    }, [session]);

    if (status === "loading") {
        return <div className="flex items-center justify-center py-8">
            <Loader variant="dots" size="md" />
        </div>;
    }

    return (
        <div ref={contentRef} className="flex flex-col">
            <TabPanel
                className="flex-wrap"
                activeKey={activeTab}
            >
                <Tab
                    key="profile"
                    title={
                        <TabTitle className="flex items-center gap-2">
                            <User size={16} /> Profile
                        </TabTitle>
                    }
                    children={
                        <div className="flex flex-col gap-5 w-full">
                            <div className="flex flex-col md:flex-row gap-5 items-center md:items-start w-full">
                                <div className="relative mx-auto md:mx-0">
                                    {session?.user.avatar ? (
                                        <Image
                                            src={session.user.avatar}
                                            alt="User avatar"
                                            width={120}
                                            height={120}
                                            className="rounded-md border border-border object-cover"
                                        />
                                    ) : (
                                        <div
                                            onClick={handleUploadAvatar}
                                            className="w-[120px] h-[120px] border border-dashed border-border rounded-md flex items-center justify-center cursor-pointer hover:bg-accent/30 transition-colors"
                                        >
                                            <Plus size={32} className="text-muted-foreground" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-4 flex-grow min-w-0 w-full">
                                    <div className="flex flex-col gap-3 w-full">
                                        <div className="text-center md:text-left">
                                            <Label
                                                size="md"
                                                variant="filled"
                                                className="break-all w-fit mx-auto md:mx-0 px-3 py-1 rounded-md"
                                            >
                                                {session?.user.email}
                                            </Label>
                                        </div>

                                        <div className="w-full mt-1">
                                            <Label
                                                htmlFor="username"
                                                className="mb-2 block text-sm md:text-left"
                                            >
                                                Username
                                            </Label>
                                            <Input
                                                id="username"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                placeholder="Enter your username"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        onClick={handleSaveProfile}
                                        loading={isLoading}
                                        className="w-full md:w-32 mt-2 md:ml-auto md:mr-0"
                                    >
                                        <Save size={16} className="mr-2" /> Save
                                    </Button>
                                </div>
                            </div>
                        </div>
                    }
                />

                <Tab
                    key="security"
                    title={
                        <TabTitle className="flex items-center gap-2">
                            <Lock size={16} /> Security
                        </TabTitle>
                    }
                    children={
                        <div className="flex flex-col gap-2">
                            <ModalSeparator/>

                            <div className="space-y-3">
                                <div>
                                    <Label htmlFor="current-password" className="mb-2 block text-sm">Current Password</Label>
                                    <Input
                                        id="current-password"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="new-password" className="mb-2 block text-sm">New Password</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="confirm-password" className="mb-2 block text-sm">Confirm Password</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                    />
                                </div>

                                <Button
                                    onClick={handleChangePassword}
                                    loading={isLoading}
                                    className="w-full mt-2"
                                >
                                    Change Password
                                </Button>
                            </div>
                        </div>
                    }
                />

                <Tab
                    key="friends"
                    title={
                        <TabTitle className="flex items-center gap-2">
                            <Users size={16} /> Friends
                        </TabTitle>
                    }
                    children={
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Users size={48} className="text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">Friends List</h3>
                            <p className="text-muted-foreground max-w-sm">
                                Friends functionality will be available in an upcoming update!
                            </p>
                        </div>
                    }
                />
            </TabPanel>
        </div>
    );
}

export const openAccountModal = () => {
    modal.open({
        body: <AccountModal/>,
        title: "Account",
        className: "max-w-[450px]"
    })
}

