import {useRoomStore} from "@/store/roomStore";
import {Popover, PopoverContent, PopoverTrigger} from "@/shared/ui/Popover";
import React, {FC, useEffect} from "react";
import {useEcho} from "@/providers/EchoProvider";
import {toast, ToastVariant} from "@/shared/ui/Toast";
import {useNotificationsStore} from "@/store/notificationsStore";
import {IUserDTO, IUserSimpleDTO, UsersService} from "@/shared/services/usersService";
import {EchoHubService, ERoomEventType, ERoomRole} from "@/shared/services/echoHubService";
import Image from "next/image";
import {Button} from "@/shared/ui/Button";
import {Lobby} from "@/views/Friends/ui/Lobby";
import {getSession} from "next-auth/react";
import { useRouter} from "next/navigation";
import {useSettingsStore} from "@/store/settingsStore";

const RoomInvite: FC<{ user: IUserSimpleDTO, onAccept: () => void, notificationId: string }> = ({ user, onAccept, notificationId }) => {
    const removeNotification = useNotificationsStore((state) => state.removeNotification);

    const declineInvite = () => {
        removeNotification(notificationId);
    }

    return (
        <div className="flex gap-3">
            <div>
                <Image src={UsersService.getUserAvatarUrl(user, true)!} alt={user.username}
                       height={20} width={60} className={"border border-border rounded-md"}/>
            </div>

            <div className="text-xs w-full">
                <div>
                    <span className="font-semibold">"{user.username}"</span> has invited you to join room
                </div>
                <div className="flex justify-between mt-2">
                    <Button size={"auto"} variant={"destructive"} className="px-2.5 py-1 rounded"
                            onClick={declineInvite}>
                        Decline
                    </Button>
                    <Button size={"auto"} variant={"success"} className="px-2.5 py-1 rounded"
                            onClick={onAccept}>
                        Accept
                    </Button>
                </div>
            </div>
        </div>
    )
}

const AvatarsLimit = 2;

const LobbyPanelComponent = () => {
    const store = useRoomStore();
    const echoContext = useEcho();
    const [members, setMembers] = React.useState<IUserDTO[]>([]);
    const router = useRouter();

    const handleLobbyChanged = ({roomId, userId}: { roomId: string, userId: number }) => {
        if(!echoContext?.echoHub) {
            return;
        }

        echoContext.echoHub?.getRoomParticipants(roomId).then(async participants => {

            // Update store data
            store.ownerId = participants.find(o => o.role === ERoomRole.Master)?.userId;
            store.roomId = roomId;
            store.setParticipants(participants);

            // Get all current participant IDs
            const currentUserIds = new Set(participants.map(p => p.userId));

            // Filter out users who are no longer in the room
            const remainingMembers = members.filter(member => currentUserIds.has(member.id));

            // Find which users we need to fetch (not already in our members array)
            const existingIds = new Set(remainingMembers.map(member => member.id));
            const usersToFetch = [...currentUserIds].filter(id => !existingIds.has(id));

            if (usersToFetch.length === 0) {
                // No new users to fetch, just update with remaining members
                setMembers(remainingMembers);
                return;
            }
     /*       // Fetch only the new users
            console.log("Fetching new users:", usersToFetch);*/
            const newUserDetails = await Promise.all(
                usersToFetch.map(id => UsersService.getUserById(id))
            );

            // Combine existing and new users
            setMembers([...remainingMembers, ...newUserDetails]);
        })
    }

    useEffect(() => {
        if(!store.roomId) {
            return;
        }
        handleLobbyChanged({roomId: store.roomId, userId: 0});
    }, [store.roomId]);

    useEffect(() => {
        if(!echoContext?.echoHub) {
            return;
        }

        const handleRoomClosed = (roomId: string) => {
            const isOwner = store.isRoomOwner;
            store.resetRoom();
            toast.open({
                body: "The room you were in has been closed",
                variant: ToastVariant.Warning
            });

            if(!isOwner) {
                router.push('/home')
            }
        }

        const handleInviteReceived = ({roomId, inviterId}: { roomId: string, inviterId: number }) => {
            const notificationId = `room-invite-${roomId}-${inviterId}`;

            const acceptInvite = () => {
                useNotificationsStore.getState().removeNotification(notificationId);
                EchoHubService.getInstance().acceptInvite(roomId).then(() => {
                    store.setRoomId(roomId);
                    toast.open({
                        body: `You have joined the room`,
                        variant: ToastVariant.Success
                    });
                })
            }

            UsersService.getUserById(inviterId).then((o) => {
                useNotificationsStore.getState().addNotification({
                    title: `Invite from "${o.username}"`,
                    type: "info",
                    // @ts-ignore
                    id: notificationId,
                    message: <RoomInvite user={o} notificationId={notificationId} onAccept={acceptInvite}/>,
                })

                toast.open({
                    body: `You have been invited to join room by "${o.username}". Click to join.`,
                    variant: ToastVariant.Info,
                    clickAction: acceptInvite
                });
            })
        }

        const handleUserKicked = ({roomId, userId}: { roomId: string, userId: number }) => {
            getSession().then(s => {
                if(!s || !s.user) {
                    return;
                }
                const sessionUserId = Number(s.user.id);
                if(sessionUserId !== userId) {
                    handleLobbyChanged({roomId, userId});
                    return;
                }

                // If the kicked user is the current user, reset the room
                store.resetRoom();
                toast.open({
                    body: "You have been kicked from the room",
                    variant: ToastVariant.Warning
                });
            })
        }

        const handleRoomEvent = ({action, param}: { action: ERoomEventType, param: any }) => {
            if (action === ERoomEventType.VideoOpen) {
                const onOpenVideo = () => router.push('/video/' + param.id);

                if(useSettingsStore.getState().autoVideoRedirect) {
                    onOpenVideo();
                    return;
                }

                toast.open({
                    body: `Your lobby now watches "${param.title}". Click to join.`,
                    variant: ToastVariant.Info,
                    clickAction: onOpenVideo
                });

                store.setCurrentVideo({
                    title: param.title,
                    id: param.id,
                    onPage: false
                })
            }
            else if(action === ERoomEventType.VideoClose) {
                store.setCurrentVideo(undefined)
                if (window.location.pathname.endsWith(`/video/${param.id}`)) {
                    toast.open({
                        body: param.isVideoPublic ?
                            "The host has stopped watching video, synchronization has stopped but you can continue to watch the video" :
                            "The video has been closed by the owner",
                        variant: ToastVariant.Warning,
                        delay: 3000
                    })

                    if(!param.isVideoPublic) {
                        router.push("/home");
                    }
                }
            }
        }

        const handleUserLeftRoom = ({roomId, userId}: { roomId: string, userId: number }) => {
            toast.open({
                body: `${members.find(o => o.id === userId)?.username} has left the lobby`,
                variant: ToastVariant.Info
            });
            handleLobbyChanged({roomId, userId});
        }

        echoContext.echoHub.OnRoomClosed.subscribe(handleRoomClosed);
        echoContext.echoHub.OnRoomDeleted.subscribe(handleRoomClosed);
        echoContext.echoHub.OnRoomInviteReceived.subscribe(handleInviteReceived);
        echoContext.echoHub.OnUserJoinedRoom.subscribe(handleLobbyChanged);
        echoContext.echoHub.OnUserLeftRoom.subscribe(handleUserLeftRoom);
        echoContext.echoHub.OnRoomUserKicked.subscribe(handleUserKicked);
        echoContext.echoHub.OnRoomEvent.subscribe(handleRoomEvent);

        return () => {
            if (echoContext?.echoHub) {
                echoContext.echoHub.OnRoomClosed.unsubscribe(handleRoomClosed);
                echoContext.echoHub.OnRoomDeleted.unsubscribe(handleRoomClosed);
                echoContext.echoHub.OnRoomInviteReceived.unsubscribe(handleInviteReceived);
                echoContext.echoHub.OnUserJoinedRoom.unsubscribe(handleLobbyChanged);
                echoContext.echoHub.OnUserLeftRoom.unsubscribe(handleUserLeftRoom);
                echoContext.echoHub.OnRoomUserKicked.unsubscribe(handleUserKicked);
                echoContext.echoHub.OnRoomEvent.unsubscribe(handleRoomEvent);
            }
        }
    }, [echoContext]);

    if(!store.roomId) {
        return;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity mr-3">
                    <div className="flex items-center">
                        {members.slice(0, AvatarsLimit + 1).map((user, index) => {
                            return (
                                <div
                                    key={user.id}
                                    className="relative -ml-2.5 border-background rounded-full"
                                    style={{zIndex: 20 + index}}
                                >
                                    {
                                        index === AvatarsLimit ?
                                            <div className="w-6 h-6 flex-center z-30 border-background border-2 bg-secondary text-[11px] rounded-full">
                                                +{ members.length - AvatarsLimit}
                                            </div>
                                            :
                                        <Image
                                            src={UsersService.getUserAvatarUrl(user, true)!}
                                            alt={`${user.username}'s avatar`}
                                            width={28}
                                            height={28}
                                            className={`rounded-full border-background border-2`}
                                        />
                                    }
                                </div>
                            );
                        })}
                    </div>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-72 mr-2 mt-1 p-3">
                <Lobby/>
            </PopoverContent>
        </Popover>
    )
}

export const LobbyPanel = React.memo(LobbyPanelComponent);