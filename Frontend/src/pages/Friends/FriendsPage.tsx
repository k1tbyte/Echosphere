"use client";

import {Label} from "@/shared/ui/Label";
import {Separator} from "@/shared/ui/Separator";
import {Badge} from "@/shared/ui/Badge";
import {useSession} from "next-auth/react";
import {Spinner} from "@/shared/ui/Loader";
import {IFriendObjectMap, IUserSimpleDTO, UsersService} from "@/shared/services/usersService";
import {FC, useRef, useState} from "react";
import useSWR from "swr";
import Image from "next/image";

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
        <div className="w-full mt-3 border-b border rounded-sm flex flex-y-center justify-between gap-3 hover:bg-secondary/40 transition-colors">
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
    const [usersLimit, setUsersLimit] = useState(30);
    const { data: session, status } = useSession({ required: true });
    const { data: users, isLoading, mutate } = useSWR(`users-${usersLimit}-${usersOffset}`, () =>
        UsersService.getUsers({ descending: true, offset: usersOffset, limit: usersLimit   })
    )
    const { data: friends, isLoading: isFriendsLoading } = useSWR(`friends-${session?.user.id}`, () => {
            if(!session?.user.id) {
                return;
            }

            return UsersService.getFriends(Number(session?.user.id))
        }
    );

    if(status !== "authenticated" || isLoading || isFriendsLoading) {
        return (
            <div className="flex-center h-full w-full">
                <Spinner/>
            </div>
        )
    }

    return (
        <div className="flex md:flex-nowrap flex-wrap p-4 h-full max-h-svh">
            <div className="border-r w-1/2 " >
                <Label className="text-xl">
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
            <div className="w-full">
                <Label className="text-xl pl-5 ">
                    Look for friends
                </Label>
                <Separator className="my-2"/>
                <div className="w-full h-full px-4">
                    {
                        users?.map(o => <FriendCard key={o.id}
                                                    friends={friends} user={o}
                                                    userId={Number(session!.user.id)}/>)
                    }
                </div>
            </div>
        </div>
    )
}