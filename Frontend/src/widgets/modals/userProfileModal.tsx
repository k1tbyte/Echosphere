import {FC, useEffect, useState} from "react";
import {modal, ModalSeparator, useModalActions} from "@/shared/ui/Modal";
import Image from "next/image";
import {IUserDTO, IUserSimpleDTO, UsersService} from "@/shared/services/usersService";
import {Spinner} from "@/shared/ui/Loader";
import {ScrollArea} from "@/shared/ui/ScrollArea";

interface IUserProfileModalProps {
    userId: number;
}

const UserProfileModal: FC<IUserProfileModalProps> = ({ userId }) => {
    const { contentRef } = useModalActions<HTMLDivElement>();
    const [user, setUser] = useState<IUserDTO>();
    const [friends, setFriends] = useState<IUserSimpleDTO[]>();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const userData = await UsersService.getUserById(userId);
                setUser(userData);
                
                const friendsData = await UsersService.getFriends(userId);
                setFriends(Array.from(friendsData.values())
                    .filter(f => f.isFriend)
                    .map(f => f.user));
            } catch (error) {
                console.error('Failed to load user data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [userId]);

    if (isLoading || !user) {
        return (
            <div ref={contentRef} className="flex-center p-4">
                <Spinner />
            </div>
        );
    }

    return (
        <div ref={contentRef} className="flex flex-col gap-3 ">
            <div className="flex gap-4">
                <Image
                    src={UsersService.getUserAvatarUrl(user, true)!}
                    alt={user.username}
                    width={80}
                    height={80}
                    className="rounded-md border border-border"
                />
                <div className="flex flex-col">
                    <h2 className="text-xl font-semibold">{user.username}</h2>
                    <span className="text-sm text-muted-foreground">Member since {new Date(user.joinedAt).toLocaleDateString()}</span>
                </div>
            </div>
            <ModalSeparator/>

            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-medium">Friends</h3>
                {friends && friends.length > 0 ? (
                    <ScrollArea className="max-h-[400px] rounded-md border">
                        <div className="flex flex-col gap-4">
                            {friends.map(friend => (
                                <div key={friend.id} className="flex items-center gap-3">
                                    <Image
                                        src={UsersService.getUserAvatarUrl(friend, true)!}
                                        alt={friend.username}
                                        width={40}
                                        height={40}
                                        className="rounded-full border border-border"
                                    />
                                    <span className="font-medium">{friend.username}</span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="text-center text-muted-foreground py-4">
                        No friends yet
                    </div>
                )}
            </div>
        </div>
    );
};

export const openUserProfileModal = (userId: number) => {
    modal.open({
        body: <UserProfileModal userId={userId} />,
        title: "User Profile",
        className: "max-w-[500px]"
    });
};