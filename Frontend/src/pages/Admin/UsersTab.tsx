"use client";

import React, { useState, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/Select";
import { EIcon, SvgIcon } from "@/shared/ui/Icon";
import { EUserRole } from "@/types/user-role";
import { IUserDTO, UsersService } from "@/shared/services/usersService";
import useSWR from "swr";
import { Spinner } from "@/shared/ui/Loader";
import { formatTimeAgoPrecise } from "@/shared/lib/formatters";
import { openConfirmationModal } from "@/widgets/modals/ConfirmationModal";
import { toast, ToastVariant } from "@/shared/ui/Toast";

const roleOptions = [
    { value: EUserRole.User.toString(), label: "User" },
    { value: EUserRole.Moder.toString(), label: "Moderator" },
    { value: EUserRole.Admin.toString(), label: "Administrator" },
    { value: EUserRole.Banned.toString(), label: "Banned" }
];

export const UsersTab = () => {
    const [usersOffset, setUsersOffset] = useState(0);
    const [usersLimit] = useState(30);
    const [allUsers, setAllUsers] = useState<IUserDTO[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const filterRef = useRef<string>("");
    const [searchValue, setSearchValue] = useState("");
    const [editingUser, setEditingUser] = useState<{ [key: string]: any }>({});

    const resetPagination = () => {
        setUsersOffset(0);
        setAllUsers([]);
        setHasMore(true);
    };

    const { data: users, isLoading, mutate } = useSWR(
        `users-${usersLimit}-${usersOffset}-${searchValue}`,
        () => UsersService.getUsers({
            descending: true,
            offset: usersOffset,
            limit: usersLimit,
            filter: searchValue
        })
    );

    React.useEffect(() => {
        if (users) {
            if (usersOffset === 0) {
                setAllUsers(users as IUserDTO[]);
            } else {
                setAllUsers(prev => [...prev, ...(users as IUserDTO[])]);
            }
            setHasMore(users.length === usersLimit);
            setIsLoadingMore(false);
        }
    }, [users, usersOffset, usersLimit]);

    const loadMore = () => {
        if (!hasMore || isLoadingMore || isLoading) return;
        setIsLoadingMore(true);
        setUsersOffset(prev => prev + usersLimit);
    };

    const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSearchValue(prev => {
            if (prev === filterRef.current) return prev;
            resetPagination();
            return filterRef.current;
        });
    };

    const handleEdit = (user: IUserDTO, field: string, value: any) => {
        setEditingUser(prev => ({
            ...prev,
            [user.id]: {
                ...prev[user.id],
                [field]: value
            }
        }));
    };

    const saveChanges = async (user: IUserDTO) => {
        const changes = editingUser[user.id];
        if (!changes) return;

        try {
            await UsersService.updateUser({
                ...user,
                ...changes
            });
            toast.open({
                variant: ToastVariant.Success,
                body: "User updated successfully"
            });
            mutate();
            setEditingUser(prev => {
                const newState = { ...prev };
                delete newState[user.id];
                return newState;
            });
        } catch (error) {
            toast.open({
                variant: ToastVariant.Error,
                body: "Failed to update user"
            });
        }
    };

    const deleteUser = async (user: IUserDTO) => {
        openConfirmationModal({
            body: `Are you sure you want to delete user "${user.username}"?`,
            destructiveYes: true,
            onYes: async () => {
                try {
                    await UsersService.deleteUser(user.id);
                    toast.open({
                        variant: ToastVariant.Success,
                        body: "User deleted successfully"
                    });
                    mutate();
                } catch (error) {
                    toast.open({
                        variant: ToastVariant.Error,
                        body: "Failed to delete user"
                    });
                }
            }
        });
    };

    return (
        <div className="w-full">
            <form onSubmit={onSearch} className="flex gap-2 mb-4">
                <Input
                    placeholder="Search users"
                    className="w-full"
                    onChange={(e) => {
                        filterRef.current = e.target.value;
                    }}
                />
                <Button variant={"outline"} className="px-6 hidden sm:flex" type="submit">
                    Search
                </Button>
                <Button variant={"outline"} className="px-3 sm:hidden" type="submit">
                    <SvgIcon icon={EIcon.Magnifier} size={20}/>
                </Button>
            </form>

            <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead className="min-w-[200px]">Username</TableHead>
                                <TableHead className="min-w-[250px]">Email</TableHead>
                                <TableHead className="min-w-[150px]">Role</TableHead>
                                <TableHead className="min-w-[150px]">Joined</TableHead>
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && usersOffset === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Spinner className="mx-auto"/>
                                    </TableCell>
                                </TableRow>
                            ) : allUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        {searchValue ? "No users found for your search" : "No users found"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                allUsers.map((user) => {
                                    const isEditing = editingUser[user.id];
                                    return (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium w-[80px]">{user.id}</TableCell>
                                            <TableCell className="min-w-[200px]">
                                                <Input
                                                    value={isEditing?.username ?? user.username}
                                                    onChange={(e) => handleEdit(user, 'username', e.target.value)}
                                                    className="h-8"
                                                />
                                            </TableCell>
                                            <TableCell className="min-w-[250px]">
                                                <Input
                                                    value={isEditing?.email ?? user.email}
                                                    onChange={(e) => handleEdit(user, 'email', e.target.value)}
                                                    className="h-8"
                                                />
                                            </TableCell>
                                            <TableCell className="min-w-[150px]">
                                                <Select
                                                    value={isEditing?.role?.toString() ?? user.role.toString()}
                                                    onValueChange={(value) => handleEdit(user, 'role', parseInt(value))}
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue/>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {roleOptions.map(option => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="min-w-[150px]">{formatTimeAgoPrecise(new Date(user.joinedAt))}</TableCell>
                                            <TableCell className="text-right space-x-2 w-[100px]">
                                                {isEditing ? (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => saveChanges(user)}
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingUser(prev => {
                                                                    const newState = { ...prev };
                                                                    delete newState[user.id];
                                                                    return newState;
                                                                });
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => deleteUser(user)}
                                                    >
                                                        Delete
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {hasMore && (
                <div className="flex justify-center mt-6">
                    {isLoadingMore ? (
                        <div className="flex items-center gap-2">
                            <Spinner/>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={loadMore}
                            className="px-8"
                        >
                            Load More
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}; 