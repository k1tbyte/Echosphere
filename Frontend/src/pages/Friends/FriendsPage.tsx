"use client";

import {Label} from "@/shared/ui/Label";
import {Separator} from "@/shared/ui/Separator";
import {Badge} from "@/shared/ui/Badge";
import {useSession} from "next-auth/react";
import {Spinner} from "@/shared/ui/Loader";
import {IFriendObjectMap, IUserSimpleDTO, UsersService} from "@/shared/services/usersService";
import {FC, useRef, useState, useEffect} from "react";
import useSWR from "swr";
import Image from "next/image";
import {Input} from "@/shared/ui/Input";
import {Button} from "@/shared/ui/Button";
import {EIcon, SvgIcon} from "@/shared/ui/Icon";

const FriendCard: FC<{user: IUserSimpleDTO, friends: IFriendObjectMap | undefined, userId: number}> = ({ user, friends, userId }) => {
    const friendRef = useRef(friends?.get(user.id));
    const [isFriend, setIsFriend] = useState(friendRef.current?.isFriend || false);
    const [isSentRequest, setIsSentRequest] = useState(friendRef.current?.isSentRequest || false);
    const [isReceivedRequest, setIsReceivedRequest] = useState(friendRef.current?.isReceivedRequest || false);
    const [isLoading, setIsLoading] = useState(false);

    const removeFriend = async () => {
        setIsLoading(true);
        await UsersService.deleteFriendship(userId, user.id).then(() => {
            setIsFriend(false);
            setIsSentRequest(false);
            setIsReceivedRequest(false);
        }).finally(() => {
            setIsLoading(false);
        })
    }

    const confirmFriendship = async () => {
        setIsLoading(true);
        await UsersService.confirmFriendship(userId, user.id).then(() => {
            setIsFriend(true);
            setIsSentRequest(false);
            setIsReceivedRequest(false);
        }).finally(() => {
            setIsLoading(false);
        })
    }

    const addFriend = async () => {
        setIsLoading(true);
        await UsersService.sendFriendship(userId, user.id).then(() => {
            setIsFriend(false);
            setIsSentRequest(true);
            setIsReceivedRequest(false);
        }).finally(() => {
            setIsLoading(false);
        })
    }


    return (
        <div className="w-full border-b border rounded-sm flex flex-y-center justify-between gap-3 hover:bg-secondary/40 transition-colors">
            <div className="flex flex-y-center">
                <Image src={UsersService.getUserAvatarUrl(user, true)!}
                       alt={user.username} className="rounded-l-sm border-r border-border mr-6"
                       width={60} height={70}
                />
                <Label size={"lg"} variant={"default"}>
                    {user.username}
                </Label>
            </div>

            <div>
                {isLoading ?
                    <div className="w-24 flex-x-center">
                        <Spinner size={26} className=""/>
                    </div>
                    :
                 isFriend ?
                    <Badge variant={"destructive"} className="mr-3 text-sm py-1.5 hover:scale-110 transition-transform cursor-pointer" onClick={removeFriend} >
                        Remove
                    </Badge> : isSentRequest ?
                    <Badge variant={"progress"} className="mr-3 text-sm py-1.5 hover:scale-110 transition-transform cursor-pointer" onClick={removeFriend}>
                        Cancel request
                    </Badge> : isReceivedRequest ?
                    <Badge variant={"progress"} className="mr-3 text-sm py-1.5 hover:scale-110 transition-transform cursor-pointer" onClick={confirmFriendship}>
                        Confirm request
                    </Badge> :
                    <Badge variant={"default"} onClick={addFriend}
                           className="mr-3 text-sm py-1.5 hover:scale-110 hover:bg-foreground transition-transform cursor-pointer">
                        Add to friends
                    </Badge>
                }

            </div>

        </div>
    )
}

export const FriendsPage = () => {
    const [usersOffset, setUsersOffset] = useState(0);
    const [usersLimit] = useState(30);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const filterRef = useRef<string>("");
    const [searchValue, setSearchValue] = useState("");
    
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
    
    const { data: friends } = useSWR(
        session?.user.id ? `friends-${session.user.id}` : null, 
        () => UsersService.getFriends(Number(session?.user.id))
    );

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
                <div className="w-full h-full flex-center">
                    <Badge variant={"outline"} className="p-3 text-center text-sm hover:bg-secondary/40">
                        <span className="pointer-events-none">
                            Invite your friends over to watch the video together!
                        </span>
                    </Badge>
                </div>
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
                    {isLoading && usersOffset === 0 ? (
                        <div className="flex-center py-8">
                            <Spinner/>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {allUsers.map(o => (
                                <FriendCard
                                    key={o.id}
                                    friends={friends}
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