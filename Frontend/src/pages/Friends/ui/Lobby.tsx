"use client";

import {Badge} from "@/shared/ui/Badge";
import {Button} from "@/shared/ui/Button";
import {FC, useEffect, useState} from "react";
import {EUserOnlineStatus, IFriendObjectMap, IUserSimpleDTO, UsersService} from "@/shared/services/usersService";
import {useRoomStore} from "@/store/roomStore";
import {HubState, useEcho} from "@/providers/EchoProvider";
import {Spinner} from "@/shared/ui/Loader";
import {toast, ToastVariant} from "@/shared/ui/Toast";
import {Copy, Crown, UserMinus} from "lucide-react";
import {Label} from "@/shared/ui/Label";
import {Separator} from "@/shared/ui/Separator";
import Image from "next/image";
import useSWR from "swr";

// Room participant with role information
interface IRoomParticipantWithRole {
    userId: number;
    role: string;
    joinedAt: string;
    user?: IUserSimpleDTO;
    isOnline?: boolean;
}

interface ILobbyProps {
    friends: IFriendObjectMap | undefined;
    userId: number;
    isPopup?: boolean;
    roomParticipants?: Map<number, IRoomParticipantWithRole>;
    isRoomOwner?: boolean;
    onKickUser?: (userId: number) => Promise<void>;
}

interface ILobbyMemberProps {
    id: number;
    user?: IUserSimpleDTO;
    role?: string;
    isOnline?: boolean;
    onInvite?: (userId: number) => void;
    onKick?: (userId: number) => void;
    canKick?: boolean;
}

const LobbyMember: FC<ILobbyMemberProps> = ({ id, user, role, isOnline, onInvite, onKick, canKick }) => {
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
    
    const isOwner = role === "Master";
    const isOffline = isOnline === false;
    
    return (
        <div className="flex flex-y-center gap-2 mt-1 border-b pb-2 justify-between">
            <div className="flex flex-y-center gap-2">
                <div className="w-8 h-8 relative shrink-0">
                    <Image
                        src={UsersService.getUserAvatarUrl(data, true) || '/default-avatar.png'}
                        alt={`${data.username}'s avatar`}
                        width={32} height={32}
                        className={`rounded-full ${isOffline ? 'opacity-50 grayscale' : ''}`}
                    />
                    {isOwner && (
                        <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full w-3 h-3 border border-secondary" 
                             title="Room Owner" />
                    )}
                    {data.onlineStatus === EUserOnlineStatus.Online && !isOffline && !isOwner && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-secondary"/>
                    )}
                    {isOffline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-500 rounded-full border border-secondary"
                             title="Offline"/>
                    )}
                </div>
                <div>
                    <Label className="text-sm text-wrap flex items-center gap-1">
                        {data.username}
                        {isOwner && <Crown size={12} className="text-yellow-500" />}
                    </Label>
                    {isOffline && (
                        <span className="text-xs text-gray-400">Offline</span>
                    )}
                </div>
            </div>

            {onInvite && (
                <Button 
                    className="px-3 py-0.5 rounded-sm" 
                    variant={"default"} 
                    size="auto"
                    onClick={() => onInvite(data.id)}
                >
                    Invite
                </Button>
            )}
            
            {canKick && onKick && (
                <Button
                    className="px-2 py-0.5 rounded-sm"
                    variant="destructive"
                    size="auto"
                    onClick={() => onKick(data.id)}
                    title="Kick user"
                >
                    <UserMinus size={16} />
                </Button>
            )}
        </div>
    );
}

export const Lobby: FC<ILobbyProps> = ({ 
    friends, 
    userId, 
    isPopup = false,
    roomParticipants,
    isRoomOwner = false,
    onKickUser
}) => {
    const roomStore = useRoomStore();
    const echoContext = useEcho();
    const [loading, setLoading] = useState(false);
    const [friendList, setFriendList] = useState<IFriendObjectMap>(friends ?? new Map());
    
    // Get the owner ID from the room store
    const ownerId = roomStore.ownerId;
    
    // Ensure isRoomOwner is correctly set based on the roomStore
    const actualIsRoomOwner = roomStore.isRoomOwner;

    // Handle online/offline status for friends
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
    }, [echoContext, friendList]);

    useEffect(() => {
        setFriendList(friends ?? new Map());
    }, [friends]);

    useEffect(() => {
        if(loading && roomStore.roomId) {
            setLoading(false);
        }
    }, [roomStore, loading]);

    const inviteUser = async (userId: number) => {
        if (!roomStore.roomId || !echoContext?.echoHub) return;
        
        try {
            await echoContext.echoHub.inviteToRoom(roomStore.roomId, userId);
            toast.open({
                body: "Invitation sent!",
                variant: ToastVariant.Success
            });
        } catch (error) {
            console.error("Error inviting user:", error);
            toast.open({
                body: "Failed to send invitation",
                variant: ToastVariant.Error
            });
        }
    };

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
        try {
            await hub.createRoom();
        } catch (error) {
            console.error("Error creating room:", error);
            toast.open({
                body: "Failed to create lobby",
                variant: ToastVariant.Error
            });
            setLoading(false);
        }
    }

    if(!roomStore.roomId) {
        return (
            <div className="w-full h-full flex-center flex-col p-4">
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
        <div className={`w-full h-full flex-col gap-3 ${isPopup ? 'p-4' : ''}`}>
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
                        setTimeout(() => {
                            toast.open({
                                body: "Room ID copied to clipboard!",
                                variant: ToastVariant.Success
                            });
                        }, 0);
                    }}>
                        <Copy size={12}/>
                    </Button>
                </div>
            </div>
            <Separator className="mt-5 mb-1"/>
            <Label className="text-sm">
                Members:
                <small className="ml-1 text-muted-foreground">
                    {roomParticipants ? `(${roomParticipants.size + 1})` : `(${roomStore.users!.size + 1})`}
                </small>
            </Label>

            {/* Current user (always displayed first) */}
            <LobbyMember 
                id={userId} 
                role={actualIsRoomOwner ? "Master" : "Member"} 
                isOnline={true}
            />
            
            {/* Other room members */}
            {roomParticipants ? (
                // Use roomParticipants if provided (with role information)
                Array.from(roomParticipants.entries()).map(([memberId, participant]) => {
                    // Only show kick button if:
                    // 1. Current user is room owner (use the value from roomStore)
                    // 2. This member is not the current user (can't kick yourself)
                    const canKickThisUser = actualIsRoomOwner && memberId !== userId;
                    
                    return (
                        <LobbyMember
                            key={`member-${memberId}`}
                            id={memberId}
                            user={participant.user}
                            role={participant.role}
                            isOnline={participant.isOnline}
                            canKick={canKickThisUser}
                            onKick={onKickUser}
                        />
                    );
                })
            ) : (
                // Fallback to roomStore.users if roomParticipants not provided
                Array.from(roomStore.users.entries()).map(([memberId, user]) => {
                    // Determine if this user is the room owner
                    const isOwner = roomStore.ownerId === memberId;
                    const canKickThisUser = actualIsRoomOwner && memberId !== userId;
                    
                    return (
                        <LobbyMember
                            key={`member-${memberId}`}
                            id={memberId}
                            user={user}
                            role={isOwner ? "Master" : "Member"}
                            canKick={canKickThisUser}
                            onKick={onKickUser}
                        />
                    );
                })
            )}

            <div className="my-3"></div>
            <Label className="text-sm">
                Friends online:
            </Label>
            {
                [...friendList.entries()]
                    .filter(([_, friend]) => {
                        // Don't show friends who are already in the room
                        const friendId = friend.user.id;
                        if (roomParticipants) {
                            return friend.user.onlineStatus === EUserOnlineStatus.Online && 
                                !roomParticipants.has(friendId) && 
                                friendId !== userId;
                        }
                        return friend.user.onlineStatus === EUserOnlineStatus.Online &&
                            !roomStore.users.has(friendId);
                    })
                    .map(([friendId, friend]) => (
                        <LobbyMember
                            key={`friend-${friendId}`}
                            id={friendId}
                            user={friend.user}
                            onInvite={inviteUser}
                        />
                    ))
            }


            <Button variant={"destructive"} className="mt-3 w-full"
                onClick={() => {
                    if (roomStore.roomId && echoContext?.echoHub) {
                        echoContext.echoHub.leaveRoom(roomStore.roomId).then(() => {
                            roomStore.resetRoom();
                            setTimeout(() => {
                                toast.open({
                                    body: "You left the lobby",
                                    variant: ToastVariant.Info
                                });
                            }, 0);
                        }).catch(error => {
                            console.error("Error leaving room:", error);
                            roomStore.resetRoom(); // Reset anyway to ensure UI is consistent
                        });
                    }
                }}>
                Leave lobby
            </Button>
        </div>
    );
}