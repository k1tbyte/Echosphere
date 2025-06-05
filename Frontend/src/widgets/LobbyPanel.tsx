import {useRoomStore} from "@/store/roomStore";
import {Popover, PopoverContent, PopoverTrigger} from "@/shared/ui/Popover";
import React, {useEffect, useState} from "react";
import {useEcho} from "@/providers/EchoProvider";
import {toast, ToastVariant} from "@/shared/ui/Toast";
import {EUserOnlineStatus, IUserSimpleDTO, UsersService} from "@/shared/services/usersService";
import {useSession} from "next-auth/react";
import {Lobby} from "@/pages/Friends/ui/Lobby";
import Image from "next/image";
import {Badge} from "@/shared/ui/Badge";
import {UserX} from "lucide-react";
import {Button} from "@/shared/ui/Button";
import {useNotificationsStore} from "@/store/notificationsStore";

// Room participant with role information
interface IRoomParticipantWithRole {
    userId: number;
    role: string;
    joinedAt: string;
    user?: IUserSimpleDTO;
    isOnline?: boolean;
}

interface IRoomInviteProps {
    roomId: string;
    inviterId: number;
    onAccept: () => void;
    onDecline: () => void;
}

const RoomInvite: React.FC<IRoomInviteProps> = ({ roomId, inviterId, onAccept, onDecline }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [inviter, setInviter] = useState<IUserSimpleDTO | null>(null);
    
    useEffect(() => {
        UsersService.getUserById(inviterId).then(setInviter);
    }, [inviterId]);
    
    if (!inviter) {
        return <div className="flex-center p-3">Loading...</div>;
    }
    
    return (
        <div className="flex gap-3">
            <div className="w-12 h-12 relative shrink-0">
                <Image 
                    src={UsersService.getUserAvatarUrl(inviter, true)!} 
                    alt={`${inviter.username}'s avatar`}
                    width={48}
                    height={48}
                    className="rounded-md border border-border"
                />
            </div>
            <div className="text-xs w-full">
                <Badge variant="outline" className="mr-2">
                    {inviter.username}
                </Badge>
                <div className="text-xs mt-1">
                    Invited you to watch together
                </div>
                {isLoading ? (
                    <div className="w-full flex-center">
                        <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                    </div>
                ) : (
                    <div className="flex justify-end gap-2 mt-2">
                        <Button size={"auto"} variant={"destructive"} className="px-2.5 py-1 rounded"
                                onClick={() => {
                                    setIsLoading(true);
                                    onDecline();
                                }}>
                            Decline
                        </Button>
                        <Button size={"auto"} variant={"success"} className="px-2.5 py-1 rounded"
                                onClick={() => {
                                    setIsLoading(true);
                                    onAccept();
                                }}>
                            Join
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export const LobbyPanel = () => {
    const store = useRoomStore();
    const echoContext = useEcho();
    const { data: session } = useSession();
    const [currentUser, setCurrentUser] = useState<IUserSimpleDTO | null>(null);
    const [friendList, setFriendList] = useState<Map<number, any>>(new Map());
    const [roomParticipants, setRoomParticipants] = useState<Map<number, IRoomParticipantWithRole>>(new Map());
    const [isRoomOwner, setIsRoomOwner] = useState(false);
    const addNotification = useNotificationsStore((state) => state.addNotification);
    const removeNotification = useNotificationsStore((state) => state.removeNotification);

    // Fetch friends for the lobby
    useEffect(() => {
        if (session?.user?.id) {
            UsersService.getFriends(Number(session.user.id))
                .then(friends => setFriendList(friends || new Map()));
        }
    }, [session]);

    // Fetch current user data
    useEffect(() => {
        if (session?.user?.id) {
            UsersService.getUserById(Number(session.user.id)).then(setCurrentUser);
        }
    }, [session]);

    // Fetch room participants when room changes
    useEffect(() => {
        const fetchRoomParticipants = async () => {
            if (!store.roomId || !echoContext?.echoHub || !session?.user?.id) return;
            
            try {
                const participants = await echoContext.echoHub.getRoomParticipants(store.roomId);
                
                // Fetch full user data for each participant
                const userMap = new Map<number, IRoomParticipantWithRole>();
                const currentUserId = Number(session.user.id);
                
                // Check if current user is room owner
                const roomOwner = participants.find((p: any) => p.role === "Master");
                
                if (roomOwner) {
                    const isOwner = roomOwner.userId === currentUserId;
                    
                    setIsRoomOwner(isOwner);
                    store.setIsRoomOwner(isOwner);
                    store.setOwnerId(roomOwner.userId);
                } else {
                    console.warn("No room owner found in participants!");
                }
                
                for (const participant of participants) {
                    // Skip current user as they'll be displayed separately
                    if (participant.userId === currentUserId) continue;
                    
                    try {
                        const userData = await UsersService.getUserById(participant.userId);
                        userMap.set(participant.userId, {
                            ...participant,
                            user: userData,
                            isOnline: userData.onlineStatus === EUserOnlineStatus.Online
                        });
                    } catch (error) {
                        console.error(`Failed to fetch user data for ${participant.userId}:`, error);
                        // Still add the participant with the data we have
                        userMap.set(participant.userId, {
                            ...participant,
                            isOnline: false
                        });
                    }
                }
                
                setRoomParticipants(userMap);
                
                // Update store with user data only (not role info)
                const userDataOnly = Array.from(userMap.values())
                    .filter(p => p.user)
                    .map(p => p.user!);
                store.setUsers(userDataOnly);
                
            } catch (error) {
                console.error("Failed to fetch room participants:", error);
            }
        };
        
        if (store.roomId) {
            fetchRoomParticipants();
        } else {
            setRoomParticipants(new Map());
        }
    }, [store.roomId, echoContext, session]);

    // Sync local isRoomOwner state with store's isRoomOwner state
    useEffect(() => {
        setIsRoomOwner(store.isRoomOwner);
    }, [store.isRoomOwner]);

    // Add a listener for the UserJoinedRoom event to refresh the participant list
    useEffect(() => {
        if (!echoContext?.echoHub) return;
        
        const refreshParticipants = () => {
            if (store.roomId) {
                // Force re-fetch of participants by triggering the effect above
                const tempRoomId = store.roomId;
                store.setRoomId(null);
                setTimeout(() => store.setRoomId(tempRoomId), 10);
            }
        };
        
        // When the user joins a room via invitation
        const onRoomJoined = () => {
            // We'll refresh the participants list
            setTimeout(refreshParticipants, 100);
        };
        
        const hub = echoContext.echoHub;
        hub.OnUserJoinedRoom.subscribe(refreshParticipants);
        hub.OnRoomJoined.subscribe(onRoomJoined);
        
        return () => {
            hub.OnUserJoinedRoom.unsubscribe(refreshParticipants);
            hub.OnRoomJoined.unsubscribe(onRoomJoined);
        };
    }, [echoContext, store]);

    // Handle all room events
    useEffect(() => {
        if(!echoContext?.echoHub || !session?.user?.id) {
            return;
        }

        const currentUserId = Number(session.user.id);

        const handleRoomClosed = (roomId: string) => {
            if(store.roomId === roomId) {
                store.resetRoom();
                toast.open({
                    body: "The room you were in has been closed",
                    variant: ToastVariant.Warning
                });
            }
        };

        const onRoomInviteReceived = ({ roomId, inviterId }: { roomId: string, inviterId: number }) => {
            console.log("Room invite received:", roomId, inviterId);
            const notificationId = `room-invite-${roomId}-${inviterId}`;
            
            addNotification({
                title: "Watch together invitation",
                type: "info",
                message: (
                    <RoomInvite 
                        roomId={roomId} 
                        inviterId={inviterId}
                        onAccept={() => {
                            if (echoContext.echoHub) {
                                echoContext.echoHub.acceptInvite(roomId).then(() => {
                                    removeNotification(notificationId);
                                    toast.open({
                                        body: "You joined the room!",
                                        variant: ToastVariant.Success
                                    });
                                }).catch(error => {
                                    console.error("Error accepting invite:", error);
                                    toast.open({
                                        body: "Failed to join the room",
                                        variant: ToastVariant.Error
                                    });
                                    removeNotification(notificationId);
                                });
                            }
                        }}
                        onDecline={() => {
                            if (echoContext.echoHub) {
                                echoContext.echoHub.declineInvite(roomId).then(() => {
                                    removeNotification(notificationId);
                                    toast.open({
                                        body: "Invitation declined",
                                        variant: ToastVariant.Info
                                    });
                                }).catch(error => {
                                    console.error("Error declining invite:", error);
                                    removeNotification(notificationId);
                                });
                            }
                        }}
                    />
                ),
                priority: 10, // Higher priority for invites
            }, notificationId);
        };

        const onUserJoined = async (userId: number) => {
            if (store.roomId && userId !== currentUserId) {
                try {
                    const user = await UsersService.getUserById(userId);
                    
                    // Get participant role from the server
                    if (echoContext.echoHub) {
                        const participants = await echoContext.echoHub.getRoomParticipants(store.roomId);
                        const participant = participants.find((p: any) => p.userId === userId);
                        
                        if (participant) {
                            // Update local state
                            setRoomParticipants(prev => {
                                const updated = new Map(prev);
                                updated.set(userId, {
                                    ...participant,
                                    user,
                                    isOnline: true
                                });
                                return updated;
                            });
                            
                            // Update store
                            const storeUsers = [...Array.from(store.users.values()), user];
                            store.setUsers(storeUsers);
                        }
                    }
                    
                    toast.open({
                        body: `${user.username} joined the room`,
                        variant: ToastVariant.Info
                    });
                } catch (error) {
                    console.error(`Failed to fetch user data for ${userId}:`, error);
                }
            }
        };

        const onUserLeft = ({ roomId, userId }: { roomId: string, userId: number }) => {
            if (store.roomId === roomId && userId !== currentUserId) {
                // Update local state
                setRoomParticipants(prev => {
                    const updated = new Map(prev);
                    const participant = updated.get(userId);
                    updated.delete(userId);
                    
                    // Show toast if we have user data
                    if (participant?.user) {
                        toast.open({
                            body: `${participant.user.username} left the room`,
                            variant: ToastVariant.Info
                        });
                    }
                    
                    return updated;
                });
                
                // Update store by removing the user
                const storeUsers = Array.from(store.users.values()).filter(u => u.id !== userId);
                store.setUsers(storeUsers);
            }
        };

        const onUserKicked = ({ roomId, userId }: { roomId: string, userId: number }) => {
            if (store.roomId === roomId && userId !== currentUserId) {
                // Update local state
                setRoomParticipants(prev => {
                    const updated = new Map(prev);
                    const participant = updated.get(userId);
                    updated.delete(userId);
                    
                    // Remove the toast notification code to prevent double toasts
                    // The kickUser function will handle showing the toast
                    
                    return updated;
                });
                
                // Update store by removing the user
                const storeUsers = Array.from(store.users.values()).filter(u => u.id !== userId);
                store.setUsers(storeUsers);
            }
        };

        const onYouWereKicked = (roomId: string) => {
            if (store.roomId === roomId) {
                // Room state is already reset by the hub service
                // Use setTimeout to avoid setState during render
                setTimeout(() => {
                    toast.open({
                        body: "You were kicked from the room",
                        variant: ToastVariant.Error
                    });
                }, 0);
            }
        };

        const onNewRoomMaster = ({ roomId, newMasterId }: { roomId: string, newMasterId: number }) => {
            if (store.roomId === roomId) {
                // Update local state
                setRoomParticipants(prev => {
                    const updated = new Map(prev);
                    
                    // Update all participants' roles
                    updated.forEach(participant => {
                        if (participant.userId === newMasterId) {
                            participant.role = "Master";
                        } else if (participant.role === "Master") {
                            participant.role = "Member";
                        }
                    });
                    
                    return updated;
                });
                
                // Update room owner status
                const isOwner = newMasterId === currentUserId;
                setIsRoomOwner(isOwner);
                store.setIsRoomOwner(isOwner);
                
                // Show toast
                if (newMasterId === currentUserId) {
                    // Use setTimeout to avoid setState during render
                    setTimeout(() => {
                        toast.open({
                            body: "You are now the room owner",
                            variant: ToastVariant.Info
                        });
                    }, 0);
                } else {
                    const newMaster = roomParticipants.get(newMasterId);
                    if (newMaster?.user) {
                        // Use setTimeout to avoid setState during render
                        const username = newMaster.user.username;
                        setTimeout(() => {
                            toast.open({
                                body: `${username} is now the room owner`,
                                variant: ToastVariant.Info
                            });
                        }, 0);
                    }
                }
            }
        };

        const onUserStatusChange = (userId: number, isOnline: boolean) => {
            if (store.roomId && roomParticipants.has(userId)) {
                setRoomParticipants(prev => {
                    const updated = new Map(prev);
                    const participant = updated.get(userId);
                    
                    if (participant) {
                        participant.isOnline = isOnline;
                        updated.set(userId, participant);
                        
                        // Show toast for status change
                        if (participant.user) {
                            // Use setTimeout to avoid setState during render
                            const username = participant.user.username;
                            const status = isOnline ? 'online' : 'offline';
                            setTimeout(() => {
                                toast.open({
                                    body: `${username} is now ${status}`,
                                    variant: ToastVariant.Info
                                });
                            }, 0);
                        }
                    }
                    
                    return updated;
                });
            }
        };

        echoContext.echoHub.OnRoomClosed.subscribe(handleRoomClosed);
        echoContext.echoHub.OnRoomDeleted.subscribe(handleRoomClosed);
        echoContext.echoHub.OnRoomInviteReceived.subscribe(onRoomInviteReceived);
        echoContext.echoHub.OnUserJoinedRoom.subscribe(onUserJoined);
        echoContext.echoHub.OnUserLeftRoom.subscribe(onUserLeft);
        echoContext.echoHub.OnUserKicked.subscribe(onUserKicked);
        echoContext.echoHub.OnYouWereKicked.subscribe(onYouWereKicked);
        echoContext.echoHub.OnNewRoomMaster.subscribe(onNewRoomMaster);
        
        // Subscribe to online/offline status changes for room members
        echoContext.echoHub.OnUserOnline.subscribe((userId) => onUserStatusChange(userId, true));
        echoContext.echoHub.OnUserOffline.subscribe((userId) => onUserStatusChange(userId, false));

        return () => {
            if (echoContext?.echoHub) {
                echoContext.echoHub.OnRoomClosed.unsubscribe(handleRoomClosed);
                echoContext.echoHub.OnRoomDeleted.unsubscribe(handleRoomClosed);
                echoContext.echoHub.OnRoomInviteReceived.unsubscribe(onRoomInviteReceived);
                echoContext.echoHub.OnUserJoinedRoom.unsubscribe(onUserJoined);
                echoContext.echoHub.OnUserLeftRoom.unsubscribe(onUserLeft);
                echoContext.echoHub.OnUserKicked.unsubscribe(onUserKicked);
                echoContext.echoHub.OnYouWereKicked.unsubscribe(onYouWereKicked);
                echoContext.echoHub.OnNewRoomMaster.unsubscribe(onNewRoomMaster);
                echoContext.echoHub.OnUserOnline.unsubscribe((userId) => onUserStatusChange(userId, true));
                echoContext.echoHub.OnUserOffline.unsubscribe((userId) => onUserStatusChange(userId, false));
            }
        }
    }, [echoContext, store, session, roomParticipants, addNotification, removeNotification]);

    const kickUser = async (userId: number) => {
        if (!store.roomId || !echoContext?.echoHub) {
            console.error("Cannot kick user: no room ID or echo hub");
            return;
        }
        
        if (!store.isRoomOwner) {
            console.error("Cannot kick user: not room owner");
            return;
        }
        
        try {
            await echoContext.echoHub.kickUser(store.roomId, userId);
            
            // Optimistically update UI
            setRoomParticipants(prev => {
                const updated = new Map(prev);
                const participant = updated.get(userId);
                updated.delete(userId);
                
                // Show toast if we have user data
                if (participant?.user) {
                    // Use setTimeout to avoid setState during render
                    const username = participant.user.username;
                    setTimeout(() => {
                        toast.open({
                            body: `${username} was kicked from the room`,
                            variant: ToastVariant.Warning
                        });
                    }, 0);
                }
                
                return updated;
            });
            
            // Update store by removing the user
            const storeUsers = Array.from(store.users.values()).filter(u => u.id !== userId);
            store.setUsers(storeUsers);
            
        } catch (error) {
            console.error("Error kicking user:", error);
            // Use setTimeout to avoid setState during render
            setTimeout(() => {
                toast.open({
                    body: "Failed to kick user",
                    variant: ToastVariant.Error
                });
            }, 0);
        }
    };

    if(!store.roomId) {
        return null;
    }

    // Get array of participants for display
    const roomUsers = Array.from(roomParticipants.values())
        .filter(p => p.user) // Only include participants with user data
        .map(p => p.user!);
    
    const userCount = roomUsers.length + 1; // +1 for current user

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity mr-3">
                    <div className="flex items-center">
                        {/* Display current user avatar */}
                        {currentUser && (
                            <div key="current-user" className="relative z-30 border-2 border-background rounded-full">
                                <Image 
                                    src={UsersService.getUserAvatarUrl(currentUser, true)!} 
                                    alt={`${currentUser.username}'s avatar`}
                                    width={28} 
                                    height={28} 
                                    className="rounded-full"
                                />
                                {store.isRoomOwner && (
                                    <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full w-3 h-3 border border-background z-40" 
                                         title="Room Owner" />
                                )}
                            </div>
                        )}
                        
                        {/* Display other users' avatars (up to 3) */}
                        {roomUsers.slice(0, 3).map((user, index) => {
                            const participant = Array.from(roomParticipants.values())
                                .find(p => p.user?.id === user.id);
                            
                            return (
                                <div 
                                    key={`room-user-${user.id}`}
                                    className="relative -ml-3 border-2 border-background rounded-full"
                                    style={{zIndex: 20 - index}}
                                >
                                    <Image 
                                        src={UsersService.getUserAvatarUrl(user, true)!}
                                        alt={`${user.username}'s avatar`}
                                        width={28} 
                                        height={28} 
                                        className={`rounded-full ${!participant?.isOnline ? 'opacity-50 grayscale' : ''}`}
                                    />
                                    {participant?.role === "Master" && (
                                        <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full w-3 h-3 border border-background z-40" 
                                             title="Room Owner" />
                                    )}
                                </div>
                            );
                        })}
                        
                        {/* If more than 4 users, show count */}
                        {userCount > 4 && (
                            <Badge variant="outline" className="-ml-2 bg-background z-10 px-1.5">
                                +{userCount - 4}
                            </Badge>
                        )}
                    </div>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-2 mt-1">
                <Lobby 
                    friends={friendList} 
                    userId={Number(session?.user?.id)} 
                    isPopup={true}
                    roomParticipants={roomParticipants}
                    isRoomOwner={store.isRoomOwner}
                    onKickUser={kickUser}
                />
            </PopoverContent>
        </Popover>
    )
}