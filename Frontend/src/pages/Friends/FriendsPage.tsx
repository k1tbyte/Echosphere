"use client";

import {Label} from "@/shared/ui/Label";
import {Separator} from "@/shared/ui/Separator";
import {Badge} from "@/shared/ui/Badge";
import {useSession} from "next-auth/react";
import {Spinner} from "@/shared/ui/Loader";
import {EUserOnlineStatus, IFriendObjectMap, IUserSimpleDTO, UsersService} from "@/shared/services/usersService";
import {FC, useEffect, useRef, useState} from "react";
import useSWR from "swr";
import Image from "next/image";
import {Input} from "@/shared/ui/Input";
import {Button} from "@/shared/ui/Button";
import {EIcon, SvgIcon} from "@/shared/ui/Icon";
import {clsx} from "clsx";
import {FriendCard} from "@/pages/Friends/ui/FriendCard";
import {Lobby} from "@/pages/Friends/ui/Lobby";
import {useFriends} from "@/shared/hooks/useFriends";
import {useTitle} from "@/widgets/player/hooks/useTitle";

export const FriendsPage = () => {
    const [usersOffset, setUsersOffset] = useState(0);
    const [usersLimit] = useState(30);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const filterRef = useRef<string>("");
    const [searchValue, setSearchValue] = useState("");
    useTitle("Friends")
    
    const { data: session, status } = useSession({ required: true });
    
    const resetPagination = () => {
        setUsersOffset(0);
        setAllUsers([]);
        setHasMore(true);
    };

    const { data: users, isLoading } = useSWR(
        `users-${usersLimit}-${usersOffset}-${searchValue}`, 
        () => UsersService.getUsers({ 
            descending: true, 
            offset: usersOffset, 
            limit: usersLimit,
            filter: searchValue
        })
    );
    
    const { data: friends, isLoading: isFriendsLoading } = useFriends(session?.user.id, true);

    // Update users list when new data is received
    useEffect(() => {
        if (users) {
            if (usersOffset === 0) {
                // New search or first load
                setAllUsers(users);
            } else {
                // Load more
                setAllUsers(prev => [...prev, ...users]);
            }
            // If we received fewer items than the limit, there are no more items
            setHasMore(users.length === usersLimit);
            setIsLoadingMore(false);
        }
    }, [users, usersOffset, usersLimit]);

    const loadMore = () => {
        if (!hasMore || isLoadingMore || isLoading) return;
        setIsLoadingMore(true);
        setUsersOffset(prev => prev + usersLimit);
    };

    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop
                >= document.documentElement.offsetHeight - 1000) {
                loadMore();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasMore, isLoadingMore, isLoading]);

    const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSearchValue(prev => {
            if(prev === filterRef.current) return prev; // No change in filter
            resetPagination();
            return filterRef.current;
        });
    };

    if(status !== "authenticated") {
        return (
            <div className="flex-center h-full w-full">
                <Spinner/>
            </div>
        )
    }

    return (
        <div className="flex flex-col md:flex-row p-4 h-full max-h-svh gap-4">
            <div className="md:w-1/3 md:border-r md:border-r-border md:pr-3" >
                <Label className="text-xl ">
                    Lobby
                </Label>
                <Separator className="my-2"/>
                <Lobby/>
            </div>
            <div className="flex-1 mt-8 md:mt-0">
                <Label className="text-xl">
                    Look for friends
                </Label>
                <Separator className="my-2"/>
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
                <div className="w-full">
                    {((isLoading && usersOffset === 0) || isFriendsLoading)  ? (
                        <div className="flex-center py-8">
                            <Spinner/>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {allUsers.map(o => (
                                <FriendCard
                                    key={o.id}
                                    friends={friends?.overall}
                                    user={o}
                                    userId={Number(session!.user.id)}
                                />
                            ))}
                            {hasMore && (
                                <div className="flex justify-center mt-6">
                                    {isLoadingMore ? (
                                        <div className="flex items-center gap-2">
                                            <Spinner />
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

                            {!hasMore && allUsers.length > 0 && (
                                <Badge variant={"outline"} className="mx-auto p-3 px-10 opacity-50 mb-6">
                                    No more users to load
                                </Badge>
                            )}

                            {!isLoading && allUsers.length === 0 && (
                                <div className="text-center text-gray-500 mt-12">
                                    {searchValue ? "No users found for your search" : "No users found"}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}