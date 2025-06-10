import useSWR from "swr";
import {UsersService} from "@/shared/services/usersService";
import {useEcho} from "@/providers/EchoProvider";
import {useEffect} from "react";
import {EGlobalEventType, TypeGlobalEventCallback} from "@/shared/services/echoHubService";


export const useFriends = (userId?: string | number, withRequests: boolean = false) => {
    const hub = useEcho();
    const { data, error, isLoading, mutate } = useSWR(
        userId ? `friends-${withRequests}-${userId}` : null,
        async () => {
            if (!userId) {
                return undefined;
            }
            return  UsersService.getFriends(Number(userId), withRequests, withRequests, 0, 1000);
        },
    );

    useEffect(() => {
        if (!hub?.echoHub) return;

        const onFriendsUpdate = (data: TypeGlobalEventCallback) => {
            if(data.action === EGlobalEventType.FriendsUpdate) {
                // Force a complete refetch, don't use cache
                mutate(undefined, { revalidate: true });
            }
        }

        hub.echoHub.OnReceiveEvent.subscribe(onFriendsUpdate);

        return () => {
            hub.echoHub?.OnReceiveEvent.unsubscribe(onFriendsUpdate);
        }
    }, [hub, mutate]);

    return { data, error, isLoading, mutate };
}