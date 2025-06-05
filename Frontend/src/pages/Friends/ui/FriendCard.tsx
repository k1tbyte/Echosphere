import {FC, useRef, useState} from "react";
import {EUserOnlineStatus, IFriendObjectMap, IUserSimpleDTO, UsersService} from "@/shared/services/usersService";
import Image from "next/image";
import {clsx} from "clsx";
import {Label} from "@/shared/ui/Label";
import {Badge} from "@/shared/ui/Badge";
import {EIcon, SvgIcon} from "@/shared/ui/Icon";
import {Spinner} from "@/shared/ui/Loader";

export const FriendCard: FC<{user: IUserSimpleDTO, friends: IFriendObjectMap | undefined, userId: number}> = ({ user, friends, userId }) => {
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
                       alt={user.username} className={clsx("rounded-sm border-r border-border mr-6 shrink-0", user)}
                       width={60} height={70}
                />

                <Label size={"lg"} variant={"default"}>
                    {user.username}
                </Label>


                { user.onlineStatus === EUserOnlineStatus.Online &&
                    <Badge variant={"success"} className="ml-2">
                        <SvgIcon icon={EIcon.CircleFilled} size={10}/>
                        <span className="ml-1">Online</span>
                    </Badge>
                }
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
