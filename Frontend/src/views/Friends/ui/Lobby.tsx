"use client";

import {Badge} from "@/shared/ui/Badge";
import {Button} from "@/shared/ui/Button";
import React, {FC, useEffect, useState} from "react";
import {
    EUserOnlineStatus,
    IFriendObject,
    IFriendObjectMap,
    IUserSimpleDTO,
    UsersService
} from "@/shared/services/usersService";
import {useRoomStore} from "@/store/roomStore";
import {HubState, useEcho} from "@/providers/EchoProvider";
import {Spinner} from "@/shared/ui/Loader";
import {toast, ToastVariant} from "@/shared/ui/Toast";
import {Copy, Crown } from "lucide-react";
import {Label} from "@/shared/ui/Label";
import {Separator} from "@/shared/ui/Separator";
import Image from "next/image";
import useSWR from "swr";
import {useFriends} from "@/shared/hooks/useFriends";
import {useSession} from "next-auth/react";
import {ERoomRole, IParticipant} from "@/shared/services/echoHubService";
import {cn} from "@/shared/lib/utils";
import {useRouter} from "next/navigation";


interface ILobbyMemberProps {
    id: number;
    user?: IUserSimpleDTO;
    participant?: IParticipant;
    // @ts-ignore
    onInvite?: (event: MouseEvent<HTMLButtonElement, MouseEvent> , userId: number) => void;
    onKick?: (userId: number) => void;
}

const LobbyMember: FC<ILobbyMemberProps> = ({ id, user, participant, onInvite, onKick }) => {
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
        <div className="flex-y-center gap-2 mt-1 border-b pb-2 justify-between">
            <div className="flex flex-y-center gap-2 w-full">
                <div className="w-8 h-8 relative shrink-0">
                    <Image
                        src={UsersService.getUserAvatarUrl(data,true)!}
                        alt={data.username}
                        width={32} height={32}
                        className="rounded-full"
                    />
                    {/* @ts-ignore */}
                    {data.onlineStatus >= EUserOnlineStatus.Online &&
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-secondary"/>
                    }
                </div>
                <div className="flex-y-center gap-1">
                    { participant?.role === ERoomRole.Master &&
                        <Crown className="text-amber-400" size={18} />
                    }
                    <Label className={cn("text-sm text-wrap", { "text-amber-400": participant?.role === ERoomRole.Master })}>
                        {data.username}
                    </Label>
                </div>
                { onKick &&
                    <div className="w-full flex-y-center justify-end">
                        <Button size={"auto"} className={"px-2 rounded py-0.5"} variant={"destructive"} onClick={() => onKick(id)}>
                            Kick
                        </Button>
                    </div>
                }
            </div>

            { onInvite && (
                <Button className="px-3 py-0.5 rounded-sm" variant={"default"} size="auto" onClick={(e) => {
                    onInvite(e, id);
                }}>
                    Invite
                </Button>
            )
            }
        </div>
    );
}

export const Lobby: FC = () => {
    const roomStore = useRoomStore();
    const { data: session, status } = useSession({ required: true })
    const echoContext = useEcho();
    const { data, isLoading: isFriendsLoading } = useFriends(session?.user.id)
    const [loading, setLoading] = useState(false);
    const [friendList, setFriendList] = useState<IFriendObjectMap>(new Map());
    const router = useRouter();

    const hub = echoContext!.echoHub!;

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
        if(loading && roomStore.roomId) {
            hub.getRoomParticipants(roomStore.roomId).then((o) => {
                roomStore.setParticipants(o);
                setLoading(false);
            })
        }
    }, [roomStore]);

    useEffect(() => {
        if(!data?.friends) {
            return;
        }

        setFriendList(data.overall);
    }, [data]);

    if(echoContext?.state !== HubState.Connected || loading || isFriendsLoading || status !== "authenticated") {
        return (
            <div className="w-full h-full flex-center flex-col gap-3">
                <Spinner/>

                <Badge variant={"progress"} className="text-sm">
                    {loading ? "Loading" : echoContext?.state.toString()} ...
                </Badge>
            </div>
        );
    }

    const createLobby = async () => {
        setLoading(true);
        console.log(roomStore);
        await hub.createRoom()
    }

    if(!roomStore.roomId) {
        return (
            <div className="w-full h-full flex-center flex-col">
                <Badge variant={"outline"} className="p-3 text-center text-sm hover:bg-secondary/40 max-w-[400px]">
                    { data?.friends?.length !== 0 ?
                        <span className="pointer-events-none">
                            Create lobby and invite your friends over to watch the video together!
                        </span>
                        :
                        <span className="pointer-events-none">
                        Add some friends to create a lobby!
                    </span>
                    }

                </Badge>
                { data?.friends?.length !== 0 &&
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
                <div className="flex items-center gap-2 w-full">
                    <Badge variant={"default"} className="text-nowrap flex-none rounded">
                        ID:
                    </Badge>
                    <div className="flex-1 min-w-0">
                        <Badge variant={"outline"} className="w-full block truncate">
                            {roomStore.roomId}
                        </Badge>
                    </div>
                    <Button variant={"ghost"} size={"auto"} className="flex-none " onClick={() => {
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
                    ({roomStore.participants!.length})
                </small>
            </Label>

            { roomStore.participants.map((p) => {

                return (
                    <LobbyMember
                        participant={p}
                        // @ts-ignore
                        onKick={(roomStore.ownerId === Number(session!.user.id) || roomStore.isRoomOwner) && p.userId != session!.user.id ?
                            (userId) => {
                                hub.kickFromRoom(roomStore.roomId!, userId);
                            } : undefined
                        }
                        key={p.userId}
                        id={p.userId}
                    />
                )
            })
            }

            <div className="my-3"></div>
            {
                [...friendList.entries()]
                    .filter(([_, friend]) => {
                        // @ts-ignore
                        return friend.user.onlineStatus >= EUserOnlineStatus.Online &&
                            !roomStore.participants.find(o => o.userId === friend.user.id);
                    })
                    .map(([userId, friend], i) => {
                        return (
                            <React.Fragment key={userId}>
                                {
                                    i === 0 &&
                                    <Label className="text-sm">
                                        Friends online:
                                    </Label>
                                }
                                <LobbyMember
                                    id={userId}
                                    user={friend.user}
                                    onInvite={(event, userId) => {
                                        const button = event.target as HTMLButtonElement;
                                        button.disabled = true;
                                        button.style.opacity = "0.5";
                                        hub.inviteToRoom(roomStore.roomId!, userId).finally(() =>
                                            window.setTimeout(() => {
                                                button.disabled = false;
                                                button.style.opacity = "1";
                                            }, 5000)
                                        )
                                    }}
                                />
                            </React.Fragment>
                        )
                    })
            }

            { roomStore.currentVideo && !roomStore.currentVideo.onPage &&
                <div className="w-full flex items-center justify-between border border-border rounded-sm p-2 mt-2">
                    <div className="flex flex-col text-sm min-w-0 flex-1">
                        <small>Now watching:</small>
                        <div className="w-full min-w-0 mt-0.5">
                            <Badge className="truncate block w-full rounded bg-secondary/50" variant={"secondary"}>
                                {roomStore.currentVideo.title}
                            </Badge>
                        </div>
                    </div>

                    <Button variant={"success"} size={"auto"} className={"px-3 rounded py-1 flex-none ml-3"} onClick={() => {
                         router.push("/video/"+roomStore.currentVideo!.id)
                    }}>
                        Join
                    </Button>
                </div>
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