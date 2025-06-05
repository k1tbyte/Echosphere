"use client";

import {Badge} from "@/shared/ui/Badge";
import {Button} from "@/shared/ui/Button";
import {FC, useEffect, useState} from "react";
import {EUserOnlineStatus, IFriendObjectMap, IUserSimpleDTO, UsersService} from "@/shared/services/usersService";
import {useRoomStore} from "@/store/roomStore";
import {HubState, useEcho} from "@/providers/EchoProvider";
import {Spinner} from "@/shared/ui/Loader";
import {toast, ToastVariant} from "@/shared/ui/Toast";
import {Copy} from "lucide-react";
import {Label} from "@/shared/ui/Label";
import {Separator} from "@/shared/ui/Separator";
import Image from "next/image";
import useSWR from "swr";

interface ILobbyProps {
    friends: IFriendObjectMap | undefined;
    userId: number;
}

interface ILobbyMemberProps {
    id: number;
    user?: IUserSimpleDTO;
    onInvite?: (userId: number) => void;
}

const LobbyMember: FC<ILobbyMemberProps> = ({ id, user, onInvite }) => {
    const { data, isLoading } = useSWR(`user-${id}`, () => {
        if(user) {
            return user;
        }
        return UsersService.getUserById(id);
    });
    if (isLoading || !data) {
        return (
            <div className="flex w-full flex-center gap-2 mt-1 border-b pb-2">
                <Spinner/>
            </div>
        );
    }
    return (
        <div className="flex flex-y-center gap-2 mt-1 border-b pb-2 justify-between">
            <div className="flex flex-y-center gap-2">
                <div className="w-8 h-8 relative shrink-0">
                    <Image
                        src={UsersService.getUserAvatarUrl(data,true)!}
                        alt={data.username}
                        width={32} height={32}
                        className="rounded-full"
                    />
                    {/* @ts-ignore */}
                    {data.onlineStatus === EUserOnlineStatus.Online &&
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-secondary"/>
                    }
                </div>
                <Label className="text-sm text-wrap">
                    {data.username}
                </Label>
            </div>

            { onInvite && (
                <Button className="px-3 py-0.5 rounded-sm" variant={"default"} size="auto">
                    Invite
                </Button>
            )
            }
        </div>
    );
}

export const Lobby: FC<ILobbyProps> = ({ friends, userId }) => {
    const roomStore = useRoomStore();
    const echoContext = useEcho();
    const [loading, setLoading] = useState(false);
    const [friendList, setFriendList] = useState<IFriendObjectMap>(friends ?? new Map());

    useEffect(() => {
        if(!echoContext?.echoHub) {
            return;
        }

        const onOnline = (userId: number) => {
            if(!friendList.has(userId)) {
                return;
            }
            const updatedFriends = new Map(friendList);
            const friend = updatedFriends.get(userId);
            if (friend) {
                friend.user.onlineStatus = EUserOnlineStatus.Online;
                updatedFriends.set(userId, friend);
                setFriendList(updatedFriends);
            }
        }

        const onOffline = (userId: number) => {
            if(!friendList.has(userId)) {
                return;
            }
            const updatedFriends = new Map(friendList);
            const friend = updatedFriends.get(userId);
            if (friend) {
                friend.user.onlineStatus = EUserOnlineStatus.Offline;
                updatedFriends.set(userId, friend);
                setFriendList(updatedFriends);
            }
        }

        echoContext.echoHub.OnUserOnline.subscribe(onOnline);
        echoContext.echoHub.OnUserOffline.subscribe(onOffline);

        return () => {
            if (echoContext?.echoHub) {
                echoContext.echoHub.OnUserOnline.unsubscribe(onOnline);
                echoContext.echoHub.OnUserOffline.unsubscribe(onOffline);
            }
        }
    }, [echoContext]);

    useEffect(() => {
        setFriendList(friends ?? new Map());
    }, [friends]);

    useEffect(() => {
        if(loading && roomStore.roomId) {
            setLoading(false);
        }
    }, [roomStore]);

    if(echoContext?.state !== HubState.Connected || loading) {
        return (
            <div className="w-full h-full flex-center flex-col gap-3">
                <Spinner/>

                <Badge variant={"progress"} className="text-sm">
                    {loading ? "Loading" : echoContext?.state.toString()} ...
                </Badge>
            </div>
        );
    }

    const hub = echoContext.echoHub!;

    const createLobby = async () => {
        setLoading(true);
        await hub.createRoom()
    }

    if(!roomStore.roomId) {
        return (
            <div className="w-full h-full flex-center flex-col">
                <Badge variant={"outline"} className="p-3 text-center text-sm hover:bg-secondary/40 max-w-[400px]">
                    { friends?.size !== 0 ?
                        <span className="pointer-events-none">
                            Create lobby and invite your friends over to watch the video together!
                        </span>
                        :
                        <span className="pointer-events-none">
                        Add some friends to create a lobby!
                    </span>
                    }

                </Badge>
                { friends?.size !== 0 &&
                    <Button className={"mt-3 w-full max-w-40"} onClick={createLobby}>
                        Create lobby
                    </Button>
                }
            </div>
        )
    }

    return (
        <div className="w-full h-full flex-col gap-3">
            <div className="bg-secondary/30 p-3 rounded-sm">
                <div className="flex flex-y-center gap-2">
                    <Badge variant={"default"} className="text-nowrap">
                        ID:
                    </Badge>
                    <Badge variant={"outline"} className="shrink overflow-ellipsis">
                        {roomStore.roomId}
                    </Badge>
                    <Button variant={"ghost"} size={"auto"} onClick={() =>{
                        navigator.clipboard.writeText(roomStore.roomId!);
                        toast.open({
                            body: "Room ID copied to clipboard!",
                            variant: ToastVariant.Success
                        });
                    }}>
                        <Copy size={12}/>
                    </Button>
                </div>
            </div>
            <Separator className="mt-5 mb-1"/>
            <Label className="text-sm">
                Members:
                <small className="ml-1 text-muted-foreground">
                    ({roomStore.users!.size + 1})
                </small>
            </Label>

            <LobbyMember id={userId}/>
            { [...roomStore.users.entries()].map(([userId, user]) => {
                return (
                    <LobbyMember
                        key={userId}
                        id={userId}
                    />
                )
            })
            }

            <div className="my-3"></div>
            <Label className="text-sm">
                Friends online:
            </Label>
            {
                [...friendList.entries()]
                    .filter(([_, friend]) => {
                        return friend.user.onlineStatus === EUserOnlineStatus.Online &&
                            !roomStore.users.has(friend.user.id);
                    })
                    .map(([userId, friend]) => {
                        return (
                                <LobbyMember
                                    key={userId}
                                    id={userId}
                                    user={friend.user}
                                    onInvite={(i) => console.log("invite ", i)}
                                />

                        )
                    })
            }


            <Button variant={"destructive"} className="mt-3 w-full"
                onClick={() => {
                    roomStore.resetRoom();
                    echoContext?.echoHub?.leaveRoom(roomStore.roomId!);
                }}>
                Leave lobby
            </Button>
        </div>
    )
}