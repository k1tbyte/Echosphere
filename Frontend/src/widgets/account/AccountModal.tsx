"use client";

import {FC, useEffect, useState} from "react";
import {Button} from "@/shared/ui/Button";
import {modal, ModalSeparator, useModalActions} from "@/shared/ui/Modal";
import {signOut, useSession} from "next-auth/react";
import Image from "next/image";
import {Lock, Plus, Save, User} from "lucide-react";
import {Label} from "@/shared/ui/Label";
import {Loader} from "@/shared/ui/Loader";
import {toast, ToastVariant} from "@/shared/ui/Toast";
import {Tab, TabPanel, TabTitle} from "@/shared/ui/Tabs";
import {Input} from "@/shared/ui/Input";
import {DropZone} from "@/widgets/dropzone";
import useSWR from "swr";
import {UsersService} from "@/shared/services/usersService";
import {EIcon, SvgIcon} from "@/shared/ui/Icon";
import {IconButton} from "@/shared/ui/Icon/SvgIcon";

export const AccountModal: FC = () => {
    const { data: session, status } = useSession();
    const { contentRef } = useModalActions<HTMLDivElement>();
    const [activeTab, setActiveTab] = useState<string>("profile");
    const [isAvatarUploading, setIsAvatarUploading] = useState(false);
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const { data: user, mutate } = useSWR(
        `getUserById-${session?.user.id}`,
        () => {
            if(!session?.user.id) return null;
            return UsersService.getUserById(Number(session?.user.id));
        }
    );

    useEffect(() => {
        UsersService.storeUserAvatarUrl(user);
    }, [user]);

    const handleUploadAvatar = (f: File) => {
        if(isAvatarUploading) {
            return;
        }
        if(f.type !== "image/png" && f.type !== "image/jpeg") {
            toast.open({
                body: "Please upload a valid image file (PNG or JPEG).",
                variant: ToastVariant.Error
            });
            return;
        }
        if(f.size > 1024 * 1024) { // 1MB limit
            toast.open({
                body: "Image size should not exceed 1MB.",
                variant: ToastVariant.Error
            });
            return;
        }
        setIsAvatarUploading(true);
        UsersService.uploadAvatar(f)
            .catch((err) => {
                console.error("Error uploading avatar:", err);
                toast.open({
                    body: "Failed to upload avatar.",
                    variant: ToastVariant.Error
                });
            })
            .then(async () => {
                await mutate(undefined, { revalidate: true }); // Refresh user data
                toast.open({
                    body: "Avatar successfully updated!",
                    variant: ToastVariant.Success
                });
            })
            .finally(() => {
                setIsAvatarUploading(false);
            });
    };

    const handleClearAvatar = () => {
        setIsAvatarUploading(true);
        UsersService.uploadAvatar(undefined)
            .catch((err) => {
                toast.open({
                    body: "Failed to remove avatar.",
                    variant: ToastVariant.Error
                });
            })
            .then(async () => {
                await mutate(undefined, { revalidate: true }); // Refresh user data
            })
            .finally(() => {
                setIsAvatarUploading(false);
            });
    }

    const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsProfileLoading(true);

        const formData = new FormData(e.currentTarget);
        const username = formData.get('username') as string;

        try {
            // @ts-ignore
            await UsersService.updateUser({
                id: user!.id,
                username: username
            });
            await mutate();
            toast.open({
                body: "Profile successfully updated!",
                variant: ToastVariant.Success
            });
        } catch (error) {
            toast.open({
                body: "Failed to update profile.",
                variant: ToastVariant.Error
            });
        } finally {
            setIsProfileLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPasswordError(null);
        setIsPasswordLoading(true);

        const formData = new FormData(e.currentTarget);
        const oldPassword = formData.get('oldPassword') as string;
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password !== confirmPassword) {
            setPasswordError("Passwords don't match!");
            setIsPasswordLoading(false);
            return;
        }

        if (oldPassword === password) {
            setPasswordError("New password must be different from the current one.");
            setIsPasswordLoading(false);
            return;
        }

        try {
            // @ts-ignore
            await UsersService.updateUser({
                id: user!.id,
                oldPassword,
                password,
            });

            toast.open({
                body: "Password successfully changed!",
                variant: ToastVariant.Success
            });
            await signOut();
        } catch (error) {
            // @ts-ignore
            setPasswordError(error!.message as string || "Failed to change password");
        } finally {
            setIsPasswordLoading(false);
        }
    };

    if (status === "loading" || !user) {
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
                        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-5 w-full">
                            <div className="flex flex-col md:flex-row gap-5 items-center md:items-start w-full">
                                <div className="relative mx-auto md:mx-0 w-[100px] h-[100px] shrink-0">
                                    {(user?.avatar) && (
                                        <div className="relative shrink-0">
                                            <Image
                                                src={UsersService.getUserAvatarUrl(user)!}
                                                alt="User avatar"
                                                width={100}
                                                height={100}
                                                loading={"lazy"}
                                                className="rounded-md border border-border object-cover shrink-0"
                                            />
                                            {isAvatarUploading && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md">
                                                    <Loader variant="dots" size="sm" />
                                                </div>
                                            )}
                                            <IconButton
                                                icon={EIcon.Close} size={16}
                                                className="absolute top-1.5 right-1.5 bg-red-500 rounded p-0.5"
                                                onClick={handleClearAvatar}/>
                                        </div>
                                    )}

                                    <DropZone
                                        className="hover:bg-accent/30 transition-colors flex-center"
                                        promptText={""} overlay={!!user?.avatar}
                                        icon={isAvatarUploading ? <Loader variant="dots" size="sm" /> : <Plus size={32} className="text-muted-foreground" />}
                                        onFileDrop={handleUploadAvatar}
                                    />
                                </div>

                                <div className="flex flex-col gap-4 flex-grow min-w-0 w-full">
                                    <div className="flex flex-col gap-3 w-full">
                                        <div className="text-center md:text-left">
                                            <Label
                                                size="md"
                                                variant="filled"
                                                className="break-all w-fit mx-auto md:mx-0 px-3 py-1 rounded-md"
                                            >
                                                {user.email}
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
                                                name="username"
                                                defaultValue={user.username || ""}
                                                placeholder="Enter your username"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        size="sm"
                                        loading={isProfileLoading}
                                        className="w-full md:w-32 mt-2 md:ml-auto md:mr-0"
                                    >
                                        <Save size={16} className="mr-2" /> Save
                                    </Button>
                                </div>
                            </div>
                        </form>
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
                        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-2">
                            <ModalSeparator/>

                            <div className="space-y-3">
                                <div>
                                    <Label htmlFor="oldPassword" className="mb-2 block text-sm">Current Password</Label>
                                    <Input
                                        id="oldPassword"
                                        name="oldPassword"
                                        type="password"
                                        required
                                        placeholder="Enter current password"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="password" className="mb-2 block text-sm">New Password</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        placeholder="Enter new password"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="confirmPassword" className="mb-2 block text-sm">Confirm Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        placeholder="Confirm new password"
                                    />
                                </div>

                                {passwordError && (
                                    <Label className="text-red-500 text-sm text-wrap">
                                        {passwordError}
                                    </Label>
                                )}

                                <Button
                                    type="submit"
                                    loading={isPasswordLoading}
                                    className="w-full mt-4"
                                >
                                    Change Password
                                </Button>
                            </div>
                        </form>
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

